import express from 'express';
import http from 'http';
import os from 'os';
import { WebSocketServer, WebSocket } from 'ws';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);

// Use noServer: true so Vite's internal middleware mode upgrade listener does not conflict with game WebSockets
const wss = new WebSocketServer({ noServer: true });

app.use(express.json());

// Allow cross-origin LAN requests if accessed via different local hostname/IP
app.use((_req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  next();
});

interface SurvivorState {
  id: string;
  name: string;
  color: string;
  position: [number, number, number];
  rotation: [number, number]; // pitch, yaw
  action: string;
  health: number;
  lastSeen: number;
}

interface StructureState {
  id: string;
  type: string;
  position: [number, number, number];
  rotation: number;
  health: number;
  builtBy: string;
}

interface ChatEntry {
  id: string;
  sender: string;
  color: string;
  text: string;
  time: number;
}

interface RoomState {
  code: string;
  hostId: string;
  survivors: Map<string, SurvivorState>;
  sockets: Map<string, WebSocket>;
  structures: StructureState[];
  depletedNodes: Map<string, number>; // nodeId -> timestamp
  chatHistory: ChatEntry[];
  weather: 'clear' | 'rain' | 'radiation_storm';
  dnaIntegrity: number;
  dnaTemperature: number;
  clonerStage: number; // 0 to 4
  createdAt: number;
}

const rooms = new Map<string, RoomState>();

function normalizeRoomCode(code?: string): string {
  const cleaned = (code || 'STRAND-1').trim().toUpperCase();
  return cleaned === 'SOLO' ? 'STRAND-1' : cleaned || 'STRAND-1';
}

function getOrCreateRoom(code: string, hostId: string): RoomState {
  const normalized = normalizeRoomCode(code);
  let room = rooms.get(normalized);
  if (!room) {
    room = {
      code: normalized,
      hostId,
      survivors: new Map(),
      sockets: new Map(),
      structures: [],
      depletedNodes: new Map(),
      chatHistory: [],
      weather: 'clear',
      dnaIntegrity: 100,
      dnaTemperature: -18,
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
      try {
        socket.send(data);
      } catch {
        // Ignore broken pipe
      }
    }
  }
}

// Periodically prune stale HTTP-polled or ghost survivors that haven't sent a heartbeat in 20 seconds
setInterval(() => {
  const now = Date.now();
  for (const [code, room] of rooms.entries()) {
    for (const [survivorId, survivor] of room.survivors.entries()) {
      const ws = room.sockets.get(survivorId);
      const isWsOpen = ws && ws.readyState === WebSocket.OPEN;
      if (!isWsOpen && now - survivor.lastSeen > 20000) {
        room.survivors.delete(survivorId);
        room.sockets.delete(survivorId);
        broadcastToRoom(room, {
          type: 'survivor_left',
          id: survivorId,
        });
      }
    }
    if (room.survivors.size === 0 && now - room.createdAt > 15 * 60 * 1000) {
      rooms.delete(code);
    }
  }
}, 5000);

// Handle HTTP -> WebSocket upgrade on /ws (and fallback root if not vite-hmr)
server.on('upgrade', (request, socket, head) => {
  const protocol = request.headers['sec-websocket-protocol'] || '';
  if (protocol.includes('vite-hmr')) {
    return; // Let Vite handle HMR upgrades if enabled
  }
  const url = request.url || '/';
  if (url.startsWith('/ws') || url === '/') {
    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit('connection', ws, request);
    });
  }
});

wss.on('connection', (ws: WebSocket) => {
  let currentRoom: RoomState | null = null;
  let currentSurvivorId: string | null = null;

  ws.on('message', (raw) => {
    try {
      const msg = JSON.parse(raw.toString());
      switch (msg.type) {
        case 'join_room': {
          const { roomCode, survivorName, color, id, position, rotation } = msg;
          const survivorId = id || 'srv_' + Math.random().toString(36).substring(2, 9);

          // If switching rooms on the same socket, remove from previous room first
          if (currentRoom && currentSurvivorId && currentRoom.code !== normalizeRoomCode(roomCode)) {
            currentRoom.survivors.delete(currentSurvivorId);
            currentRoom.sockets.delete(currentSurvivorId);
            broadcastToRoom(currentRoom, {
              type: 'survivor_left',
              id: currentSurvivorId,
            });
          }

          currentSurvivorId = survivorId;
          const room = getOrCreateRoom(roomCode, survivorId);
          currentRoom = room;

          const existing = room.survivors.get(survivorId);
          const survivor: SurvivorState = {
            id: survivorId,
            name: (survivorName || existing?.name || `Survivor-${survivorId.slice(0, 4)}`).slice(0, 20),
            color: color || existing?.color || '#06B6D4',
            position: Array.isArray(position) && position.length === 3 ? position : existing?.position || [0, 1.65, 8],
            rotation: Array.isArray(rotation) && rotation.length === 2 ? rotation : existing?.rotation || [0, 0],
            action: 'idle',
            health: existing?.health ?? 100,
            lastSeen: Date.now(),
          };

          room.survivors.set(survivorId, survivor);
          room.sockets.set(survivorId, ws);

          // Send current room state to newly joined survivor
          ws.send(
            JSON.stringify({
              type: 'init_state',
              yourId: survivorId,
              roomCode: room.code,
              survivors: Array.from(room.survivors.values()),
              structures: room.structures,
              chatHistory: room.chatHistory,
              weather: room.weather,
              dnaIntegrity: room.dnaIntegrity,
              dnaTemperature: room.dnaTemperature,
              clonerStage: room.clonerStage,
            })
          );

          // Notify other survivors in this room
          broadcastToRoom(
            room,
            {
              type: 'survivor_joined',
              survivor,
            },
            survivorId
          );
          break;
        }

        case 'player_move': {
          if (!currentRoom || !currentSurvivorId) return;
          const survivor = currentRoom.survivors.get(currentSurvivorId);
          if (survivor) {
            if (Array.isArray(msg.position) && msg.position.length === 3) {
              survivor.position = msg.position;
            }
            if (Array.isArray(msg.rotation) && msg.rotation.length === 2) {
              survivor.rotation = msg.rotation;
            }
            survivor.action = msg.action || 'idle';
            if (typeof msg.health === 'number') {
              survivor.health = Math.round(msg.health);
            }
            survivor.lastSeen = Date.now();

            broadcastToRoom(
              currentRoom,
              {
                type: 'survivor_moved',
                id: currentSurvivorId,
                name: survivor.name,
                color: survivor.color,
                position: survivor.position,
                rotation: survivor.rotation,
                action: survivor.action,
                health: survivor.health,
              },
              currentSurvivorId
            );
          }
          break;
        }

        case 'build_structure': {
          if (!currentRoom || !msg.structure) return;
          const structId = msg.structure.id || 'str_' + Math.random().toString(36).substring(2, 8);
          if (currentRoom.structures.some((s) => s.id === structId)) break;

          const newStruct: StructureState = {
            id: structId,
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
          const requestedStage =
            typeof msg.clonerStage === 'number' ? msg.clonerStage : (currentRoom.clonerStage || 0) + 1;
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

        case 'weather_change': {
          if (!currentRoom || !msg.weather) return;
          currentRoom.weather = msg.weather;
          broadcastToRoom(
            currentRoom,
            {
              type: 'weather_sync',
              weather: currentRoom.weather,
              changedBy: currentSurvivorId,
            },
            currentSurvivorId || undefined
          );
          break;
        }

        case 'update_dna': {
          if (!currentRoom) return;
          if (typeof msg.dnaIntegrity === 'number') currentRoom.dnaIntegrity = msg.dnaIntegrity;
          if (typeof msg.dnaTemperature === 'number') currentRoom.dnaTemperature = msg.dnaTemperature;
          broadcastToRoom(
            currentRoom,
            {
              type: 'dna_sync',
              dnaIntegrity: currentRoom.dnaIntegrity,
              dnaTemperature: currentRoom.dnaTemperature,
            },
            currentSurvivorId || undefined
          );
          break;
        }

        case 'resource_harvested': {
          if (!currentRoom || !msg.nodeId) return;
          currentRoom.depletedNodes.set(msg.nodeId, Date.now());
          broadcastToRoom(
            currentRoom,
            {
              type: 'resource_depleted',
              nodeId: msg.nodeId,
              harvestedBy: currentSurvivorId,
            },
            currentSurvivorId || undefined
          );
          break;
        }

        case 'chat': {
          if (!currentRoom || !currentSurvivorId || !msg.text) return;
          const survivor = currentRoom.survivors.get(currentSurvivorId);
          const chatEntry: ChatEntry = {
            id: msg.id || 'chat_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
            sender: survivor?.name || msg.sender || 'Survivor',
            color: survivor?.color || msg.color || '#06B6D4',
            text: String(msg.text).slice(0, 240),
            time: Date.now(),
          };
          currentRoom.chatHistory.push(chatEntry);
          if (currentRoom.chatHistory.length > 50) {
            currentRoom.chatHistory.shift();
          }
          broadcastToRoom(currentRoom, {
            type: 'chat_broadcast',
            ...chatEntry,
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
      // Only delete if this socket is still the active socket for this survivorId
      if (currentRoom.sockets.get(currentSurvivorId) === ws) {
        currentRoom.sockets.delete(currentSurvivorId);
        currentRoom.survivors.delete(currentSurvivorId);
        broadcastToRoom(currentRoom, {
          type: 'survivor_left',
          id: currentSurvivorId,
        });
      }
    }
  });
});

// ============================================================================
// HTTP MULTIPLAYER SYNC & FALLBACK API (Works even if WS is blocked by a proxy)
// ============================================================================

app.post('/api/mp/sync', (req, res) => {
  try {
    const { roomCode, id, name, color, position, rotation, action, health } = req.body || {};
    if (!id) {
      res.status(400).json({ error: 'Missing survivor id' });
      return;
    }
    const room = getOrCreateRoom(roomCode || 'STRAND-1', id);
    const isNew = !room.survivors.has(id);
    const existing = room.survivors.get(id);

    const survivor: SurvivorState = {
      id,
      name: (name || existing?.name || `Survivor-${String(id).slice(0, 4)}`).slice(0, 20),
      color: color || existing?.color || '#06B6D4',
      position:
        Array.isArray(position) && position.length === 3
          ? position
          : existing?.position || [0, 1.65, 8],
      rotation:
        Array.isArray(rotation) && rotation.length === 2
          ? rotation
          : existing?.rotation || [0, 0],
      action: action || existing?.action || 'idle',
      health: typeof health === 'number' ? Math.round(health) : existing?.health ?? 100,
      lastSeen: Date.now(),
    };

    room.survivors.set(id, survivor);

    if (isNew) {
      broadcastToRoom(
        room,
        {
          type: 'survivor_joined',
          survivor,
        },
        id
      );
    } else {
      broadcastToRoom(
        room,
        {
          type: 'survivor_moved',
          id: survivor.id,
          name: survivor.name,
          color: survivor.color,
          position: survivor.position,
          rotation: survivor.rotation,
          action: survivor.action,
          health: survivor.health,
        },
        id
      );
    }

    res.json({
      roomCode: room.code,
      survivors: Array.from(room.survivors.values()),
      structures: room.structures,
      chatHistory: room.chatHistory,
      weather: room.weather,
      clonerStage: room.clonerStage,
      dnaIntegrity: room.dnaIntegrity,
      dnaTemperature: room.dnaTemperature,
    });
  } catch (err) {
    console.error('HTTP /api/mp/sync error:', err);
    res.status(500).json({ error: 'Internal sync error' });
  }
});

app.post('/api/mp/event', (req, res) => {
  try {
    const { roomCode, id, type, structure, clonerStage, weather, text, sender, color, nodeId } = req.body || {};
    const room = getOrCreateRoom(roomCode || 'STRAND-1', id || 'host');

    if (type === 'build_structure' && structure) {
      const structId = structure.id || 'str_' + Math.random().toString(36).substring(2, 8);
      if (!room.structures.some((s) => s.id === structId)) {
        const newStruct: StructureState = {
          id: structId,
          type: structure.type,
          position: structure.position,
          rotation: structure.rotation || 0,
          health: 100,
          builtBy: id || 'unknown',
        };
        room.structures.push(newStruct);
        broadcastToRoom(room, { type: 'structure_added', structure: newStruct }, id);
      }
    } else if (type === 'upgrade_cloner' && typeof clonerStage === 'number') {
      if (clonerStage > room.clonerStage) {
        room.clonerStage = Math.min(4, clonerStage);
        broadcastToRoom(room, { type: 'cloner_upgraded', clonerStage: room.clonerStage, upgradedBy: id }, id);
      }
    } else if (type === 'weather_change' && weather) {
      room.weather = weather;
      broadcastToRoom(room, { type: 'weather_sync', weather: room.weather, changedBy: id }, id);
    } else if (type === 'resource_harvested' && nodeId) {
      room.depletedNodes.set(nodeId, Date.now());
      broadcastToRoom(room, { type: 'resource_depleted', nodeId, harvestedBy: id }, id);
    } else if (type === 'chat' && text) {
      const survivor = id ? room.survivors.get(id) : undefined;
      const chatEntry: ChatEntry = {
        id: 'chat_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
        sender: survivor?.name || sender || 'Survivor',
        color: survivor?.color || color || '#06B6D4',
        text: String(text).slice(0, 240),
        time: Date.now(),
      };
      room.chatHistory.push(chatEntry);
      if (room.chatHistory.length > 50) room.chatHistory.shift();
      broadcastToRoom(room, { type: 'chat_broadcast', ...chatEntry });
    } else if (type === 'leave' && id) {
      room.survivors.delete(id);
      room.sockets.delete(id);
      broadcastToRoom(room, { type: 'survivor_left', id });
    }

    res.json({ ok: true });
  } catch (err) {
    console.error('HTTP /api/mp/event error:', err);
    res.status(500).json({ error: 'Event error' });
  }
});

// Helper to discover local LAN IPv4 addresses for Local Network Multiplayer
function getLocalLanAddresses(port: number | string): string[] {
  const urls: string[] = [];
  try {
    const interfaces = os.networkInterfaces();
    for (const name of Object.keys(interfaces)) {
      for (const iface of interfaces[name] || []) {
        if (iface.family === 'IPv4' && !iface.internal) {
          urls.push(`http://${iface.address}:${port}`);
        }
      }
    }
  } catch {
    // Ignore os interface errors
  }
  return urls;
}

// REST API for room status, LAN discovery, and unity exporter metadata
app.get('/api/status', (_req, res) => {
  const PORT = process.env.PORT || 3000;
  res.json({
    activeRooms: rooms.size,
    totalSurvivors: Array.from(rooms.values()).reduce((sum, r) => sum + r.survivors.size, 0),
    lanUrls: getLocalLanAddresses(PORT),
  });
});

app.get('/api/rooms', (_req, res) => {
  const PORT = process.env.PORT || 3000;
  const roomList = Array.from(rooms.values()).map((r) => ({
    code: r.code,
    survivorsCount: r.survivors.size,
    survivorNames: Array.from(r.survivors.values()).map((s) => s.name),
    structuresCount: r.structures.length,
    clonerStage: r.clonerStage,
    dnaIntegrity: r.dnaIntegrity,
    weather: r.weather,
  }));
  res.json({
    rooms: roomList,
    lanUrls: getLocalLanAddresses(PORT),
  });
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
      },
    ],
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

  const PORT = Number(process.env.PORT) || 3000;
  // Bind to 0.0.0.0 so devices across the local network (LAN) can connect to port 3000
  server.listen(PORT, '0.0.0.0', () => {
    const lanUrls = getLocalLanAddresses(PORT);
    console.log(`RGSHSC Server running on http://0.0.0.0:${PORT} [${isDev ? 'development' : 'production'}]`);
    if (lanUrls.length > 0) {
      console.log(`Local Network (LAN) Multiplayer URLs: ${lanUrls.join(', ')}`);
    }
  });
}

startServer();
