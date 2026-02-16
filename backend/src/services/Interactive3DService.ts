/* ═══════════════════════════════════════════════════════════════
   Interactive 3D Service

   Generates specifications for 3D visualizations including network
   topology, rotatable architecture diagrams, and immersive
   experiences. Creates WebGL-ready 3D scenes.
   ═══════════════════════════════════════════════════════════════ */

import { v4 as uuid } from 'uuid';
import {
  type Scene3D,
  type Entity3D,
  type CameraPath3D,
  type CameraKeyframe3D,
  type LayerConfig3D,
  type InteractionMode,
  type VRConfig,
  type KGNode,
  type KGEdge,
  DataType,
} from '../../shared/types';

/**
 * 3D Layout and Visualization Service
 */
export class Interactive3DService {
  /**
   * Generate 3D scene from knowledge graph
   */
  generate3DScene(
    nodes: KGNode[],
    edges: KGEdge[],
    layoutType: '3d-force' | '3d-hierarchical' | '3d-layered' | '3d-sphere',
    focusNodeId?: string,
  ): Scene3D {
    // Calculate 3D positions for entities
    const entities3D = this.calculate3DLayout(nodes, layoutType);

    // Generate camera path
    const cameraPath = this.generateCameraPath(
      entities3D,
      layoutType,
      focusNodeId,
    );

    // Determine layer configuration
    const layers = this.generateLayerConfig(nodes, layoutType);

    // Generate interaction modes
    const interactionMode: InteractionMode = {
      orbit: true,
      pan: true,
      zoom: true,
      rotate: true,
      select: true,
      flyThrough: layoutType === '3d-force' || layoutType === '3d-layered',
    };

    return {
      id: uuid(),
      entities: entities3D,
      connections: this.generate3DConnections(edges, entities3D),
      cameraPath,
      layers,
      interactionMode,
      lighting: this.generateLighting(),
      environment: this.generateEnvironment(layoutType),
    };
  }

  /**
   * Calculate 3D positions using various layout algorithms
   */
  private calculate3DLayout(
    nodes: KGNode[],
    layoutType: '3d-force' | '3d-hierarchical' | '3d-layered' | '3d-sphere',
  ): Entity3D[] {
    switch (layoutType) {
      case '3d-hierarchical':
        return this.hierarchical3DLayout(nodes);
      case '3d-layered':
        return this.layered3DLayout(nodes);
      case '3d-sphere':
        return this.sphere3DLayout(nodes);
      default:
        return this.force3DLayout(nodes);
    }
  }

  /**
   * Force-directed 3D layout
   */
  private force3DLayout(nodes: KGNode[]): Entity3D[] {
    const entities: Entity3D[] = [];

    // Simple circular arrangement in 3D space
    const radius = 50;
    nodes.forEach((node, i) => {
      const angle = (i / nodes.length) * Math.PI * 2;
      const height = (i % 3) * 20 - 20; // Vary height

      entities.push({
        id: node.id,
        type: node.type,
        label: node.label,
        position: {
          x: Math.cos(angle) * radius,
          y: height,
          z: Math.sin(angle) * radius,
        },
        scale: this.getEntityScale(node.type),
        rotation: { x: 0, y: 0, z: 0 },
        color: this.getEntityColor(node.type),
        geometry: this.getEntityGeometry(node.type),
        opacity: 1.0,
        metadata: node.content,
      });
    });

    return entities;
  }

  /**
   * Hierarchical 3D layout (tree structure)
   */
  private hierarchical3DLayout(nodes: KGNode[]): Entity3D[] {
    const entities: Entity3D[] = [];
    const levelsPerDepth = new Map<number, number>();

    // Count nodes at each depth
    nodes.forEach((node) => {
      const count = levelsPerDepth.get(node.depth) || 0;
      levelsPerDepth.set(node.depth, count + 1);
    });

    const depthIndices = new Map<number, number>();

    return nodes.map((node) => {
      const currentIndex = depthIndices.get(node.depth) || 0;
      depthIndices.set(node.depth, currentIndex + 1);

      const nodesAtDepth = levelsPerDepth.get(node.depth) || 1;
      const x = (currentIndex / Math.max(1, nodesAtDepth - 1) - 0.5) * 100;
      const z = -node.depth * 40;
      const y = 0;

      return {
        id: node.id,
        type: node.type,
        label: node.label,
        position: { x, y, z },
        scale: this.getEntityScale(node.type),
        rotation: { x: 0, y: 0, z: 0 },
        color: this.getEntityColor(node.type),
        geometry: this.getEntityGeometry(node.type),
        opacity: 1.0,
        metadata: node.content,
      };
    });
  }

  /**
   * Layered 3D layout (stack by data type)
   */
  private layered3DLayout(nodes: KGNode[]): Entity3D[] {
    const layerMap: Record<DataType, number> = {
      [DataType.CONCEPT]: 0,
      [DataType.DEFINITION]: 10,
      [DataType.EXAMPLE]: 20,
      [DataType.ANALOGY]: 30,
      [DataType.PROCESS]: 40,
      [DataType.RELATIONSHIP]: 50,
      [DataType.RESOURCE]: 60,
      [DataType.COUNTERPOINT]: 70,
    };

    const nodesByLayer = new Map<number, KGNode[]>();
    nodes.forEach((node) => {
      const layer = layerMap[node.type];
      if (!nodesByLayer.has(layer)) nodesByLayer.set(layer, []);
      nodesByLayer.get(layer)!.push(node);
    });

    const entities: Entity3D[] = [];

    nodesByLayer.forEach((layerNodes, zDepth) => {
      const gridSize = Math.ceil(Math.sqrt(layerNodes.length));

      layerNodes.forEach((node, i) => {
        const row = Math.floor(i / gridSize);
        const col = i % gridSize;

        entities.push({
          id: node.id,
          type: node.type,
          label: node.label,
          position: {
            x: (col / Math.max(1, gridSize - 1) - 0.5) * 80,
            y: (row / Math.max(1, gridSize - 1) - 0.5) * 80,
            z: zDepth,
          },
          scale: this.getEntityScale(node.type),
          rotation: { x: 0, y: 0, z: 0 },
          color: this.getEntityColor(node.type),
          geometry: this.getEntityGeometry(node.type),
          opacity: 1.0,
          metadata: node.content,
        });
      });
    });

    return entities;
  }

  /**
   * Spherical 3D layout
   */
  private sphere3DLayout(nodes: KGNode[]): Entity3D[] {
    const radius = 50;
    const goldenAngle = Math.PI * (3 - Math.sqrt(5));

    return nodes.map((node, i) => {
      const y = 1 - (i / Math.max(1, nodes.length - 1)) * 2;
      const radiusAtY = Math.sqrt(1 - y * y);
      const theta = goldenAngle * i;

      const x = Math.cos(theta) * radiusAtY * radius;
      const z = Math.sin(theta) * radiusAtY * radius;
      const yPos = y * radius;

      return {
        id: node.id,
        type: node.type,
        label: node.label,
        position: { x, y: yPos, z },
        scale: this.getEntityScale(node.type),
        rotation: { x: 0, y: 0, z: 0 },
        color: this.getEntityColor(node.type),
        geometry: this.getEntityGeometry(node.type),
        opacity: 1.0,
        metadata: node.content,
      };
    });
  }

  /**
   * Generate 3D connections
   */
  private generate3DConnections(
    edges: KGEdge[],
    entities: Entity3D[],
  ): Array<{
    id: string;
    sourceId: string;
    targetId: string;
    type: 'straight' | 'curved' | 'tube';
    color: string;
    thickness: number;
    animated: boolean;
  }> {
    return edges.map((edge) => {
      const sourceEntity = entities.find((e) => e.id === edge.sourceId);
      const targetEntity = entities.find((e) => e.id === edge.targetId);

      let connectionType: 'straight' | 'curved' | 'tube' = 'straight';

      if (sourceEntity && targetEntity) {
        const dx = targetEntity.position.x - sourceEntity.position.x;
        const dy = targetEntity.position.y - sourceEntity.position.y;
        const dz = targetEntity.position.z - sourceEntity.position.z;
        const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);

        connectionType = distance > 60 ? 'curved' : 'straight';
      }

      return {
        id: edge.id,
        sourceId: edge.sourceId,
        targetId: edge.targetId,
        type: connectionType,
        color: this.getEdgeColor(edge.type),
        thickness: 2,
        animated: true,
      };
    });
  }

  /**
   * Generate camera fly-through path
   */
  private generateCameraPath(
    entities: Entity3D[],
    layoutType: string,
    focusNodeId?: string,
  ): CameraPath3D {
    const keyframes: CameraKeyframe3D[] = [];
    const duration = 8000;

    if (layoutType === '3d-sphere') {
      keyframes.push(
        {
          time: 0,
          position: { x: 80, y: 0, z: 0 },
          lookAt: { x: 0, y: 0, z: 0 },
          fov: 75,
        },
        {
          time: duration * 0.5,
          position: { x: 0, y: 80, z: 0 },
          lookAt: { x: 0, y: 0, z: 0 },
          fov: 75,
        },
        {
          time: duration,
          position: { x: 0, y: 0, z: 80 },
          lookAt: { x: 0, y: 0, z: 0 },
          fov: 75,
        },
      );
    } else {
      keyframes.push(
        {
          time: 0,
          position: { x: -50, y: 30, z: 80 },
          lookAt: { x: 0, y: 0, z: 0 },
          fov: 75,
        },
        {
          time: duration * 0.5,
          position: { x: 0, y: 50, z: 60 },
          lookAt: { x: 0, y: 0, z: 0 },
          fov: 60,
        },
        {
          time: duration,
          position: { x: 50, y: 30, z: 80 },
          lookAt: { x: 0, y: 0, z: 0 },
          fov: 75,
        },
      );
    }

    return {
      keyframes,
      duration,
      easing: 'easeInOutCubic',
      loop: false,
    };
  }

  /**
   * Generate layer configuration
   */
  private generateLayerConfig(
    nodes: KGNode[],
    layoutType: string,
  ): LayerConfig3D[] {
    if (layoutType !== '3d-layered') {
      return [{ name: 'default', zRange: [-100, 100], opacity: 1.0, visible: true }];
    }

    return [
      {
        name: 'Concepts',
        zRange: [-5, 5],
        opacity: 1.0,
        visible: true,
        color: '#2196f3',
      },
      {
        name: 'Definitions',
        zRange: [10, 10],
        opacity: 1.0,
        visible: true,
        color: '#9c27b0',
      },
      {
        name: 'Examples',
        zRange: [20, 20],
        opacity: 1.0,
        visible: true,
        color: '#4caf50',
      },
      {
        name: 'Processes',
        zRange: [40, 40],
        opacity: 1.0,
        visible: true,
        color: '#00bcd4',
      },
    ];
  }

  /**
   * Generate lighting
   */
  private generateLighting(): {
    ambient: { color: string; intensity: number };
    directional: Array<{
      color: string;
      intensity: number;
      position: { x: number; y: number; z: number };
    }>;
    point: Array<{
      color: string;
      intensity: number;
      position: { x: number; y: number; z: number };
      distance: number;
    }>;
  } {
    return {
      ambient: {
        color: '#ffffff',
        intensity: 0.4,
      },
      directional: [
        {
          color: '#ffffff',
          intensity: 0.8,
          position: { x: 50, y: 100, z: 50 },
        },
      ],
      point: [
        {
          color: '#00e5ff',
          intensity: 1.0,
          position: { x: 0, y: 0, z: 0 },
          distance: 200,
        },
      ],
    };
  }

  /**
   * Generate environment
   */
  private generateEnvironment(
    layoutType: string,
  ): {
    background: 'gradient' | 'skybox' | 'solid';
    backgroundColor: string;
    fog: { enabled: boolean; color: string; near: number; far: number };
    grid: { enabled: boolean; size: number; divisions: number };
  } {
    return {
      background: 'gradient',
      backgroundColor: '#05060a',
      fog: {
        enabled: true,
        color: '#05060a',
        near: 50,
        far: 200,
      },
      grid: {
        enabled: layoutType === '3d-layered',
        size: 100,
        divisions: 10,
      },
    };
  }

  /**
   * Generate VR/AR configuration
   */
  generateVRConfig(): VRConfig {
    return {
      enabled: true,
      mode: 'vr',
      controllers: {
        left: { enabled: true, raycast: true, teleport: true },
        right: { enabled: true, raycast: true, select: true },
      },
      locomotion: 'teleport',
      scale: 1.0,
      playerHeight: 1.7,
    };
  }

  /**
   * Helper methods
   */

  private getEntityScale(dataType: DataType): { x: number; y: number; z: number } {
    const scaleMap: Record<DataType, number> = {
      [DataType.CONCEPT]: 1.2,
      [DataType.DEFINITION]: 1.0,
      [DataType.EXAMPLE]: 1.1,
      [DataType.ANALOGY]: 1.3,
      [DataType.PROCESS]: 1.4,
      [DataType.RELATIONSHIP]: 0.8,
      [DataType.RESOURCE]: 0.9,
      [DataType.COUNTERPOINT]: 1.0,
    };

    const scale = scaleMap[dataType];
    return { x: scale, y: scale, z: scale };
  }

  private getEntityColor(dataType: DataType): string {
    const colorMap: Record<DataType, string> = {
      [DataType.CONCEPT]: '#2196f3',
      [DataType.DEFINITION]: '#9c27b0',
      [DataType.EXAMPLE]: '#4caf50',
      [DataType.ANALOGY]: '#ffab00',
      [DataType.PROCESS]: '#00bcd4',
      [DataType.RELATIONSHIP]: '#f06292',
      [DataType.RESOURCE]: '#81c784',
      [DataType.COUNTERPOINT]: '#e57373',
    };

    return colorMap[dataType];
  }

  private getEntityGeometry(
    dataType: DataType,
  ): 'box' | 'sphere' | 'cylinder' | 'cone' | 'torus' {
    const geometryMap: Record<
      DataType,
      'box' | 'sphere' | 'cylinder' | 'cone' | 'torus'
    > = {
      [DataType.CONCEPT]: 'box',
      [DataType.DEFINITION]: 'cylinder',
      [DataType.EXAMPLE]: 'box',
      [DataType.ANALOGY]: 'torus',
      [DataType.PROCESS]: 'cylinder',
      [DataType.RELATIONSHIP]: 'sphere',
      [DataType.RESOURCE]: 'cone',
      [DataType.COUNTERPOINT]: 'sphere',
    };

    return geometryMap[dataType];
  }

  private getEdgeColor(edgeType: string): string {
    const colorMap: Record<string, string> = {
      hierarchical: '#00e5ff',
      reference: '#ffab00',
      analogy: '#f06292',
      prerequisite: '#81c784',
      alternative: '#e57373',
      related: '#2196f3',
    };

    return colorMap[edgeType] || '#00e5ff';
  }
}
