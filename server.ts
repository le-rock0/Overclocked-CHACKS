import express from 'express';
import http from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

app.use(express.json());

interface SurvivorState {
  id: string;
  name: string;
  color: string;
  position: [number, number, number];
  rotation: [number, number]; // pitch, yaw
  action: string;
  health: number;
}

interface StructureState {
  id: string;
  type: string;
  position: [number, number, number];
  rotation: number;
  health: number;
  builtBy: string;
}

interface RoomState {
  code: string;
  hostId: string;
  survivors: Map<string, SurvivorState>;
  sockets: Map<string, WebSocket>;
  structures: StructureState[];
  dnaIntegrity: number;
  dnaTemperature: number;
  clonerStage: number; // 0 to 4 (0: None, 1: Cryo, 2: Bioreactor, 3: Gene Shifter, 4: RGSHSC Complete)
  createdAt: number;
}

const rooms = new Map<string, RoomState>();

function getOrCreateRoom(code: string, hostId: string): RoomState {
  const normalized = code.trim().toUpperCase() || 'ALPHA';
  let room = rooms.get(normalized);
  if (!room) {
    room = {
      code: normalized,
      hostId,
      survivors: new Map(),
      sockets: new Map(),
      structures: [],
      dnaIntegrity: 100,
      dnaTemperature: -18, // Optimal cryogenic Celsius
      clonerStage: 0,
      createdAt: Date.now(),
    };
    rooms.set(normalized, room);
  }
  return room;
}

function broadcastToRoom(room: RoomState, message: object, excludeId?: string) {
  const data = JSON.stringify(message);
  for (const [survivorId, socket] of room.sockets.entries()) {
    if (survivorId !== excludeId && socket.readyState === WebSocket.OPEN) {
      socket.send(data);
    }
  }
}

wss.on('connection', (ws: WebSocket) => {
  let currentRoom: RoomState | null = null;
  let currentSurvivorId: string | null = null;

  ws.on('message', (raw) => {
    try {
      const msg = JSON.parse(raw.toString());
      switch (msg.type) {
        case 'join_room': {
          const { roomCode, survivorName, color, id } = msg;
          const survivorId = id || Math.random().toString(36).substring(2, 9);
          currentSurvivorId = survivorId;
          const room = getOrCreateRoom(roomCode, survivorId);
          currentRoom = room;

          const survivor: SurvivorState = {
            id: survivorId,
            name: survivorName || `Survivor-${survivorId.slice(0, 4)}`,
            color: color || '#06B6D4',
            position: [0, 1.2, 5],
            rotation: [0, 0],
            action: 'idle',
            health: 100,
          };

          room.survivors.set(survivorId, survivor);
          room.sockets.set(survivorId, ws);

          // Send current state to newly joined survivor
          ws.send(JSON.stringify({
            type: 'init_state',
            yourId: survivorId,
            roomCode: room.code,
            survivors: Array.from(room.survivors.values()),
            structures: room.structures,
            dnaIntegrity: room.dnaIntegrity,
            dnaTemperature: room.dnaTemperature,
            clonerStage: room.clonerStage,
          }));

          // Notify other survivors in this room
          broadcastToRoom(room, {
            type: 'survivor_joined',
            survivor,
          }, survivorId);
          break;
        }

        case 'player_move': {
          if (!currentRoom || !currentSurvivorId) return;
          const survivor = currentRoom.survivors.get(currentSurvivorId);
          if (survivor) {
            survivor.position = msg.position;
            survivor.rotation = msg.rotation;
            survivor.action = msg.action || 'idle';
            broadcastToRoom(currentRoom, {
              type: 'survivor_moved',
              id: currentSurvivorId,
              position: msg.position,
              rotation: msg.rotation,
              action: msg.action,
            }, currentSurvivorId);
          }
          break;
        }

        case 'build_structure': {
          if (!currentRoom) return;
          const newStruct: StructureState = {
            id: msg.structure.id || 'str_' + Math.random().toString(36).substring(2, 8),
            type: msg.structure.type,
            position: msg.structure.position,
            rotation: msg.structure.rotation || 0,
            health: 100,
            builtBy: currentSurvivorId || 'unknown',
          };
          currentRoom.structures.push(newStruct);
          broadcastToRoom(
            currentRoom,
            {
              type: 'structure_added',
              structure: newStruct,
            },
            currentSurvivorId || undefined
          );
          break;
        }

        case 'upgrade_cloner': {
          if (!currentRoom) return;
          const requestedStage = typeof msg.clonerStage === 'number' ? msg.clonerStage : (currentRoom.clonerStage || 0) + 1;
          const nextStage = Math.max(currentRoom.clonerStage || 0, Math.min(4, requestedStage));
          if (nextStage === currentRoom.clonerStage) break;
          currentRoom.clonerStage = nextStage;
          broadcastToRoom(
            currentRoom,
            {
              type: 'cloner_upgraded',
              clonerStage: currentRoom.clonerStage,
              upgradedBy: currentSurvivorId,
            },
            currentSurvivorId || undefined
          );
          break;
        }

        case 'update_dna': {
          if (!currentRoom) return;
          if (typeof msg.dnaIntegrity === 'number') currentRoom.dnaIntegrity = msg.dnaIntegrity;
          if (typeof msg.dnaTemperature === 'number') currentRoom.dnaTemperature = msg.dnaTemperature;
          broadcastToRoom(currentRoom, {
            type: 'dna_sync',
            dnaIntegrity: currentRoom.dnaIntegrity,
            dnaTemperature: currentRoom.dnaTemperature,
          }, currentSurvivorId || undefined);
          break;
        }

        case 'resource_harvested': {
          if (!currentRoom) return;
          broadcastToRoom(currentRoom, {
            type: 'resource_depleted',
            nodeId: msg.nodeId,
            harvestedBy: currentSurvivorId,
          });
          break;
        }

        case 'chat': {
          if (!currentRoom || !currentSurvivorId) return;
          const survivor = currentRoom.survivors.get(currentSurvivorId);
          broadcastToRoom(currentRoom, {
            type: 'chat_broadcast',
            sender: survivor?.name || 'Survivor',
            color: survivor?.color || '#06B6D4',
            text: msg.text,
            time: Date.now(),
          });
          break;
        }
      }
    } catch (err) {
      console.error('WebSocket message parsing error:', err);
    }
  });

  ws.on('close', () => {
    if (currentRoom && currentSurvivorId) {
      currentRoom.survivors.delete(currentSurvivorId);
      currentRoom.sockets.delete(currentSurvivorId);
      broadcastToRoom(currentRoom, {
        type: 'survivor_left',
        id: currentSurvivorId,
      });

      if (currentRoom.survivors.size === 0) {
        // Keep room alive for 15 minutes before cleanup
        setTimeout(() => {
          if (currentRoom && currentRoom.survivors.size === 0) {
            rooms.delete(currentRoom.code);
          }
        }, 15 * 60 * 1000);
      }
    }
  });
});

// REST API for room status and unity exporter metadata
app.get('/api/status', (_req, res) => {
  res.json({
    activeRooms: rooms.size,
    totalSurvivors: Array.from(rooms.values()).reduce((sum, r) => sum + r.survivors.size, 0),
  });
});

app.get('/api/rooms', (_req, res) => {
  const roomList = Array.from(rooms.values()).map(r => ({
    code: r.code,
    survivorsCount: r.survivors.size,
    structuresCount: r.structures.length,
    clonerStage: r.clonerStage,
    dnaIntegrity: r.dnaIntegrity,
  }));
  res.json(roomList);
});

// Serve Unity C# Script Package contents
app.get('/api/unity/scripts', (_req, res) => {
  res.json({
    scripts: [
      {
        fileName: 'RGSHSC_ClonerMachine.cs',
        content: `// RGSHSC (Reproductive Gene Shifting Homo Sapien Cloner) System
// Compatible with Unity 2021.3+, 2022.3+, Unity 6
using UnityEngine;
using System.Collections;

public class RGSHSC_ClonerMachine : MonoBehaviour
{
    public enum ClonerStage { Inactive = 0, CryoStasis = 1, Bioreactor = 2, GeneShifter = 3, RGSHSC_Complete = 4 }
    
    [Header("Cloner Configuration")]
    public ClonerStage currentStage = ClonerStage.Inactive;
    public float dnaStability = 100f;
    public float incubatorTemperature = -18f;
    public bool isCloningSequenceActive = false;
    
    [Header("Visual References")]
    public Light cryoCoreLight;
    public ParticleSystem bioAuraEffect;
    public Transform dnaVialSocket;
    public GameObject humanHologramVisual;
    
    void Start()
    {
        UpdateVisuals();
    }
    
    public void AdvanceStage()
    {
        if ((int)currentStage < 4)
        {
            currentStage++;
            UpdateVisuals();
            Debug.Log("[RGSHSC] Upgraded to stage: " + currentStage);
        }
    }
    
    public void StartCloningSequence()
    {
        if (currentStage == ClonerStage.RGSHSC_Complete && !isCloningSequenceActive)
        {
            StartCoroutine(CloningProcessRoutine());
        }
    }
    
    IEnumerator CloningProcessRoutine()
    {
        isCloningSequenceActive = true;
        Debug.Log("[RGSHSC] Initiating reproductive gene shifting sequence...");
        if (humanHologramVisual) humanHologramVisual.SetActive(true);
        yield return new WaitForSeconds(5.0f);
        Debug.Log("[RGSHSC] Cloned human generation successful! Humanity is restored!");
        isCloningSequenceActive = false;
    }
    
    void UpdateVisuals()
    {
        if (cryoCoreLight)
        {
            cryoCoreLight.color = currentStage == ClonerStage.RGSHSC_Complete ? Color.green : Color.cyan;
            cryoCoreLight.intensity = (int)currentStage * 1.5f;
        }
    }
}
`,
      },
      {
        fileName: 'SurvivorPlayerController.cs',
        content: `// Survivor First-Person Controller with DNA Preservation Mechanics
using UnityEngine;

[RequireComponent(typeof(CharacterController))]
public class SurvivorPlayerController : MonoBehaviour
{
    [Header("Movement")]
    public float walkSpeed = 6f;
    public float sprintSpeed = 10f;
    public float jumpHeight = 1.5f;
    public float gravity = -19.62f;
    
    [Header("Camera & Look")]
    public Camera playerCamera;
    public float mouseSensitivity = 2f;
    public float headBobFrequency = 1.5f;
    public float headBobAmplitude = 0.05f;
    
    [Header("Survival Vitals")]
    public float health = 100f;
    public float hunger = 100f;
    public float dnaIntegrity = 100f;
    
    private CharacterController controller;
    private Vector3 velocity;
    private float xRotation = 0f;
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
        float mouseX = Input.GetAxis("Mouse X") * mouseSensitivity;
        float mouseY = Input.GetAxis("Mouse Y") * mouseSensitivity;
        xRotation -= mouseY;
        xRotation = Mathf.Clamp(xRotation, -85f, 85f);
        if (playerCamera) playerCamera.transform.localRotation = Quaternion.Euler(xRotation, 0f, 0f);
        transform.Rotate(Vector3.up * mouseX);

        // Movement
        float x = Input.GetAxis("Horizontal");
        float z = Input.GetAxis("Vertical");
        float speed = Input.GetKey(KeyCode.LeftShift) ? sprintSpeed : walkSpeed;
        Vector3 move = transform.right * x + transform.forward * z;
        controller.Move(move * speed * Time.deltaTime);

        // Jump
        if (Input.GetButtonDown("Jump") && isGrounded)
        {
            velocity.y = Mathf.Sqrt(jumpHeight * -2f * gravity);
        }

        velocity.y += gravity * Time.deltaTime;
        controller.Move(velocity * Time.deltaTime);
    }
}
`,
      },
      {
        fileName: 'ModularBaseBuilding.cs',
        content: `// Modular Base Building System for Shelter Construction
using UnityEngine;

public class ModularBaseBuilding : MonoBehaviour
{
    public GameObject foundationPrefab;
    public GameObject wallPrefab;
    public GameObject solarCollectorPrefab;
    public GameObject cryoPodPrefab;
    
    public LayerMask buildLayer;
    public float buildRange = 8f;
    public float gridSnap = 2f;
    
    public void PlaceStructure(GameObject prefab, Vector3 worldHitPoint)
    {
        Vector3 snappedPos = new Vector3(
            Mathf.Round(worldHitPoint.x / gridSnap) * gridSnap,
            worldHitPoint.y,
            Mathf.Round(worldHitPoint.z / gridSnap) * gridSnap
        );
        Instantiate(prefab, snappedPos, Quaternion.identity);
    }
}
`,
      },
      {
        fileName: 'README_UNITY_IMPORT.md',
        content: `# RGSHSC: The Last Strand — Unity Import Instructions

## How to import into your Unity Project:
1. Open or create a 3D Unity project (Universal Render Pipeline or Standard).
2. Create a folder named \`Assets/RGSHSC\`.
3. Put the exported \`.gltf\` or \`.obj\` 3D models into \`Assets/RGSHSC/Models/\`.
4. Put these C# scripts into \`Assets/RGSHSC/Scripts/\`.
5. Attach \`SurvivorPlayerController.cs\` to a Capsule with a CharacterController and Main Camera child.
6. Attach \`RGSHSC_ClonerMachine.cs\` to the exported RGSHSC 3D model.
7. Press Play! You now have the exact base-building, DNA preservation, and RGSHSC cloning loop in Unity.
`,
      }
    ]
  });
});

async function startServer() {
  const isDev = process.env.NODE_ENV !== 'production';

  if (isDev) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  const PORT = process.env.PORT || 3000;
  server.listen(PORT, () => {
    console.log(`RGSHSC Server running on port ${PORT} [${isDev ? 'development' : 'production'}]`);
  });
}

startServer();
