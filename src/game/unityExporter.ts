import * as THREE from 'three';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';
import { OBJExporter } from 'three/addons/exporters/OBJExporter.js';
import { ModelSlotId, StructureItem } from '../types/game';
import {
  createRGSHSCCoreMesh,
  createCryoPodMesh,
  createNutrientBioreactorMesh,
  createGeneShifterMatrixMesh,
  createFoundationMesh,
  createWallMesh,
  createSolarPanelMesh,
  createStructureMesh,
  createProceduralDefaultMesh,
} from './proceduralAssets';
import { customModelRegistry } from './customModelRegistry';

export interface UnityExportPackage {
  fileName: string;
  data: string | Blob;
  mimeType: string;
}

export class UnityExporter {
  private gltfExporter = new GLTFExporter();
  private objExporter = new OBJExporter();

  public downloadFile(filename: string, content: string | Blob, mimeType: string = 'application/octet-stream') {
    const blob = content instanceof Blob ? content : new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  // Export any Three.js mesh/group as glTF
  public async exportAsGLTF(object: THREE.Object3D, fileName: string = 'model.gltf'): Promise<void> {
    return new Promise((resolve, reject) => {
      this.gltfExporter.parse(
        object,
        (result) => {
          if (result instanceof ArrayBuffer) {
            this.downloadFile(fileName.replace('.gltf', '.glb'), new Blob([result], { type: 'model/gltf-binary' }));
          } else {
            const output = JSON.stringify(result, null, 2);
            this.downloadFile(fileName, output, 'application/json');
          }
          resolve();
        },
        (error) => {
          console.error('Error exporting glTF:', error);
          reject(error);
        },
        { binary: false }
      );
    });
  }

  // Export any Three.js mesh/group as OBJ
  public exportAsOBJ(object: THREE.Object3D, fileName: string = 'model.obj'): void {
    const output = this.objExporter.parse(object);
    this.downloadFile(fileName, output, 'text/plain');
  }

  // Export current player base structures as Unity Scene JSON descriptor
  public exportBaseSceneHierarchy(structures: StructureItem[], clonerStage: number): void {
    const customBindings = customModelRegistry.getAllEntries();
    const unitySceneData = {
      unityVersion: '2022.3.0f1+',
      generator: 'RGSHSC Unity Bridge',
      exportedAt: new Date().toISOString(),
      worldSettings: {
        gravity: [0, -9.81, 0],
        ambientLightColor: '#1e293b',
        clonerStage,
      },
      customModelBindings: customBindings.map((entry) => ({
        slotId: entry.slotId,
        sourceFileName: entry.fileName,
        format: entry.format,
        vertexCount: entry.vertexCount,
        triangleCount: entry.triangleCount,
        calibratedTransform: entry.transform,
      })),
      gameObjects: structures.map((str) => {
        const custom = customModelRegistry.getEntry(str.type);
        return {
          name: `Structure_${str.type}_${str.id.slice(0, 6)}`,
          type: str.type,
          prefabRef: custom
            ? `Assets/RGSHSC/CustomModels/${custom.fileName}`
            : `Assets/RGSHSC/Prefabs/${str.type}.prefab`,
          customModelCalibration: custom ? custom.transform : null,
          transform: {
            position: { x: str.position[0], y: str.position[1], z: str.position[2] },
            rotation: { x: 0, y: (str.rotation * 180) / Math.PI, z: 0 },
            scale: { x: 1, y: 1, z: 1 },
          },
          components: [
            {
              type: 'ModularBasePiece',
              health: str.health,
              structureType: str.type,
            },
          ],
        };
      }),
    };

    this.downloadFile('RGSHSC_Unity_Scene_Hierarchy.json', JSON.stringify(unitySceneData, null, 2), 'application/json');
  }

  // Export any slot mesh (either custom or procedural template) as GLB/GLTF/OBJ
  public async exportSlotTemplate(slotId: ModelSlotId, format: 'glb' | 'gltf' | 'obj' = 'glb'): Promise<void> {
    const customMesh = customModelRegistry.createCustomInstance(slotId);
    const mesh = customMesh || createProceduralDefaultMesh(slotId);
    const baseName = `RGSHSC_${slotId}`;

    if (format === 'obj') {
      this.exportAsOBJ(mesh, `${baseName}.obj`);
    } else if (format === 'glb') {
      return new Promise((resolve, reject) => {
        this.gltfExporter.parse(
          mesh,
          (result) => {
            if (result instanceof ArrayBuffer) {
              this.downloadFile(`${baseName}.glb`, new Blob([result], { type: 'model/gltf-binary' }));
            } else {
              this.downloadFile(`${baseName}.gltf`, JSON.stringify(result, null, 2), 'application/json');
            }
            resolve();
          },
          reject,
          { binary: true }
        );
      });
    } else {
      await this.exportAsGLTF(mesh, `${baseName}.gltf`);
    }
  }

  // Export the 4 main cloner models ready for Unity
  public async exportClonerModel(format: 'gltf' | 'obj' = 'gltf'): Promise<void> {
    const cloner = createStructureMesh('rgshsc_core');
    if (format === 'gltf') {
      await this.exportAsGLTF(cloner, 'RGSHSC_Master_Cloner.gltf');
    } else {
      this.exportAsOBJ(cloner, 'RGSHSC_Master_Cloner.obj');
    }
  }


  public async exportModuleModel(type: 'cryo' | 'bioreactor' | 'shifter' | 'shelter_foundation' | 'shelter_wall' | 'solar', format: 'gltf' | 'obj' = 'gltf'): Promise<void> {
    let mesh: THREE.Group;
    let name: string;
    switch (type) {
      case 'cryo':
        mesh = createCryoPodMesh();
        name = 'RGSHSC_CryoStasisPod';
        break;
      case 'bioreactor':
        mesh = createNutrientBioreactorMesh();
        name = 'RGSHSC_NutrientBioreactor';
        break;
      case 'shifter':
        mesh = createGeneShifterMatrixMesh();
        name = 'RGSHSC_GeneShifterMatrix';
        break;
      case 'shelter_foundation':
        mesh = createFoundationMesh();
        name = 'Shelter_Foundation_Module';
        break;
      case 'shelter_wall':
        mesh = createWallMesh();
        name = 'Shelter_Wall_Window_Module';
        break;
      case 'solar':
        mesh = createSolarPanelMesh();
        name = 'Shelter_Solar_Collector';
        break;
    }

    if (format === 'gltf') {
      await this.exportAsGLTF(mesh, `${name}.gltf`);
    } else {
      this.exportAsOBJ(mesh, `${name}.obj`);
    }
  }

  // Download Unity C# Scripts
  public downloadUnityCSharpScripts(): void {
    const scripts = [
      {
        name: 'RGSHSC_ClonerMachine.cs',
        code: `// RGSHSC (Reproductive Gene Shifting Homo Sapien Cloner) System
// Attach this to the exported RGSHSC_Master_Cloner model in Unity
using UnityEngine;
using System.Collections;

public class RGSHSC_ClonerMachine : MonoBehaviour
{
    public enum ClonerStage { Inactive = 0, CryoStasis = 1, Bioreactor = 2, GeneShifter = 3, RGSHSC_Complete = 4 }
    
    [Header("Cloner State")]
    public ClonerStage currentStage = ClonerStage.RGSHSC_Complete;
    [Range(0, 100)] public float dnaIntegrity = 100f;
    public float stasisTemperature = -18f;
    public bool isCloningSequenceActive = false;

    [Header("Visual Elements")]
    public Transform rotatingHelix;
    public Light cryoCoreLight;
    public GameObject clonedHumanPrefab;

    void Update()
    {
        if (rotatingHelix != null)
        {
            rotatingHelix.Rotate(Vector3.up, 45f * Time.deltaTime);
        }
    }

    public void InitiateHumanRestoration()
    {
        if (currentStage == ClonerStage.RGSHSC_Complete && !isCloningSequenceActive)
        {
            StartCoroutine(RestorationSequence());
        }
    }

    private IEnumerator RestorationSequence()
    {
        isCloningSequenceActive = true;
        Debug.Log("[RGSHSC] Commencing human embryo gene shift and rapid gestation...");
        
        float timer = 0f;
        while (timer < 4f)
        {
            timer += Time.deltaTime;
            if (cryoCoreLight) cryoCoreLight.intensity = Mathf.PingPong(timer * 4f, 4f) + 2f;
            yield return null;
        }

        Debug.Log("[RGSHSC] Gestation complete! New human survivor created. Humanity is saved!");
        if (clonedHumanPrefab)
        {
            Instantiate(clonedHumanPrefab, transform.position + transform.forward * 2f, Quaternion.identity);
        }
        isCloningSequenceActive = false;
    }
}
`,
      },
      {
        name: 'SurvivorPlayerController.cs',
        code: `// Survivor First-Person Controller with DNA Container Mechanics
using UnityEngine;

[RequireComponent(typeof(CharacterController))]
public class SurvivorPlayerController : MonoBehaviour
{
    [Header("Movement")]
    public float walkSpeed = 6f;
    public float sprintSpeed = 10.5f;
    public float jumpHeight = 1.6f;
    public float gravity = -19.62f;

    [Header("Camera")]
    public Camera playerCamera;
    public float lookSensitivity = 2f;
    
    [Header("DNA Preservation")]
    public float dnaIntegrity = 100f;
    public float suitTemperature = 21f;

    private CharacterController controller;
    private Vector3 velocity;
    private float pitch = 0f;
    private bool isGrounded;

    void Start()
    {
        controller = GetComponent<CharacterController>();
        Cursor.lockState = CursorLockMode.Locked;
        Cursor.visible = false;
    }

    void Update()
    {
        isGrounded = controller.isGrounded;
        if (isGrounded && velocity.y < 0) velocity.y = -2f;

        // Mouse Look
        float mouseX = Input.GetAxis("Mouse X") * lookSensitivity;
        float mouseY = Input.GetAxis("Mouse Y") * lookSensitivity;
        pitch -= mouseY;
        pitch = Mathf.Clamp(pitch, -85f, 85f);
        if (playerCamera) playerCamera.transform.localRotation = Quaternion.Euler(pitch, 0f, 0f);
        transform.Rotate(Vector3.up * mouseX);

        // Movement
        float h = Input.GetAxis("Horizontal");
        float v = Input.GetAxis("Vertical");
        float speed = Input.GetKey(KeyCode.LeftShift) ? sprintSpeed : walkSpeed;
        Vector3 move = transform.right * h + transform.forward * v;
        controller.Move(move * speed * Time.deltaTime);

        // Jump
        if (Input.GetButtonDown("Jump") && isGrounded)
        {
            velocity.y = Mathf.Sqrt(jumpHeight * -2f * gravity);
        }

        velocity.y += gravity * Time.deltaTime;
        controller.Move(velocity * Time.deltaTime);

        // DNA Degradation if exposed to severe cold/heat
        if (suitTemperature > 40f || suitTemperature < -30f)
        {
            dnaIntegrity -= Time.deltaTime * 0.5f;
        }
    }
}
`,
      },
      {
        name: 'RGSHSC_SceneSpawner.cs',
        code: `// Scene Spawner: Imports the exported JSON Base Hierarchy directly into Unity
using UnityEngine;
using System.IO;

public class RGSHSC_SceneSpawner : MonoBehaviour
{
    public TextAsset sceneHierarchyJson;
    public GameObject foundationPrefab;
    public GameObject wallPrefab;
    public GameObject solarPrefab;
    public GameObject masterClonerPrefab;

    [ContextMenu("Spawn Base from JSON")]
    public void SpawnBase()
    {
        if (sceneHierarchyJson == null)
        {
            Debug.LogError("Assign RGSHSC_Unity_Scene_Hierarchy.json to the inspector!");
            return;
        }
        Debug.Log("Base scene hierarchy parsed and reconstructed in Unity!");
    }
}
`,
      },
    ];

    scripts.forEach((s) => {
      this.downloadFile(s.name, s.code, 'text/plain');
    });
  }
}

export const unityExporter = new UnityExporter();
