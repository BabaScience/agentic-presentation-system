/* ═══════════════════════════════════════════════════════════════
   Demo Knowledge Graph — Kubernetes Networking
   Embedded fallback for when backend is unavailable.
   Includes frame-based visual scripts for the IllustrationCanvas.
   ═══════════════════════════════════════════════════════════════ */

import type { KGNode, KGEdge, PresentationScene, VisualScript } from '../stores/sessionStore';

export const DEMO_NODES: Record<string, KGNode> = {
  'root': {
    id: 'root', label: 'Kubernetes Networking', type: 'CONCEPT', depth: 0,
    content: 'Kubernetes networking is a set of rules for how Pods communicate with each other and the outside world.',
    narration: "Let's explore Kubernetes Networking — the foundational system that enables Pods, Services, and external traffic to communicate seamlessly within a cluster.",
    visual: { elementType: 'box', x: 480, y: 260, width: 180, height: 95, style: { fill: '#0d2030', stroke: '#00e5ff', strokeWidth: 3, cornerRadius: 16, fontSize: 14, opacity: 1 }, animation: { type: 'fadeIn', duration: 600, delay: 0 }, icon: '🕸️' },
    rlRelevanceScore: 1.0, isExpanded: true, isPresented: false, parentId: null, metadata: {},
  },
  'pod': {
    id: 'pod', label: 'Pod', type: 'CONCEPT', depth: 1,
    content: 'A Pod is the smallest deployable unit in Kubernetes. Each Pod gets its own unique IP address within the cluster.',
    narration: "A Pod is the fundamental building block. Think of it as a wrapper around one or more containers. Every Pod receives its own unique IP address, which means containers inside different Pods can talk to each other directly.",
    visual: { elementType: 'box', x: 200, y: 120, width: 150, height: 85, style: { fill: '#151924', stroke: '#00e5ff', strokeWidth: 2, cornerRadius: 12, fontSize: 13, opacity: 1 }, animation: { type: 'fadeIn', duration: 500, delay: 150 }, icon: '📦' },
    rlRelevanceScore: 0.95, isExpanded: true, isPresented: false, parentId: 'root', metadata: {},
  },
  'service': {
    id: 'service', label: 'Service', type: 'CONCEPT', depth: 1,
    content: 'A Service provides a stable endpoint to access a group of Pods. It load-balances traffic across matching Pods.',
    narration: "A Service solves a critical problem: Pods are ephemeral — they come and go. A Service gives you a stable IP address and DNS name that persists, automatically load-balancing traffic to healthy Pods behind the scenes.",
    visual: { elementType: 'box', x: 740, y: 120, width: 150, height: 85, style: { fill: '#151924', stroke: '#00e5ff', strokeWidth: 2, cornerRadius: 12, fontSize: 13, opacity: 1 }, animation: { type: 'fadeIn', duration: 500, delay: 300 }, icon: '🔵' },
    rlRelevanceScore: 0.9, isExpanded: true, isPresented: false, parentId: 'root', metadata: {},
  },
  'ingress': {
    id: 'ingress', label: 'Ingress Controller', type: 'CONCEPT', depth: 1,
    content: 'Ingress manages external access to Services, typically via HTTP/HTTPS routing rules.',
    narration: "The Ingress Controller is your cluster's front door. It manages external HTTP and HTTPS traffic, routing requests to the right Service based on hostnames and URL paths.",
    visual: { elementType: 'box', x: 480, y: 50, width: 150, height: 85, style: { fill: '#151924', stroke: '#00e5ff', strokeWidth: 2, cornerRadius: 12, fontSize: 13, opacity: 1 }, animation: { type: 'fadeIn', duration: 500, delay: 450 }, icon: '🌐' },
    rlRelevanceScore: 0.85, isExpanded: false, isPresented: false, parentId: 'root', metadata: {},
  },
  'phone-book': {
    id: 'phone-book', label: 'Service = Phone Book', type: 'ANALOGY', depth: 2,
    content: 'A Service is like a phone book entry: the name stays the same even if the person (Pod) changes their phone number (IP).',
    narration: "Think of a Service like a phone book. You look up 'Customer Support' and always reach the right department, even if the actual people behind the desk change shifts. The Service name stays stable while Pods rotate.",
    visual: { elementType: 'box', x: 740, y: 350, width: 150, height: 85, style: { fill: '#2a1f0a', stroke: '#ffab00', strokeWidth: 2, cornerRadius: 12, fontSize: 12, opacity: 1 }, animation: { type: 'fadeIn', duration: 400, delay: 0 }, icon: '📖' },
    rlRelevanceScore: 0.7, isExpanded: false, isPresented: false, parentId: 'service', metadata: {},
  },
  'iptables': {
    id: 'iptables', label: 'iptables NAT Rules', type: 'PROCESS', depth: 2,
    content: 'kube-proxy programs iptables NAT rules on every node to redirect Service IPs to actual Pod IPs.',
    narration: "Under the hood, kube-proxy sets up iptables rules on every node. When traffic arrives for a Service IP, these NAT rules redirect it to an actual Pod IP — it's like an invisible switchboard routing calls.",
    visual: { elementType: 'box', x: 200, y: 420, width: 150, height: 85, style: { fill: '#1a1a30', stroke: '#b388ff', strokeWidth: 2, cornerRadius: 12, fontSize: 12, opacity: 1 }, animation: { type: 'fadeIn', duration: 400, delay: 0 }, icon: '⚡' },
    rlRelevanceScore: 0.65, isExpanded: false, isPresented: false, parentId: 'service', metadata: {},
  },
  'coredns': {
    id: 'coredns', label: 'CoreDNS Resolution', type: 'PROCESS', depth: 2,
    content: 'CoreDNS provides DNS-based service discovery: Pods resolve Service names to ClusterIPs automatically.',
    narration: "CoreDNS is the cluster's built-in DNS server. When a Pod wants to talk to a Service, it queries CoreDNS with the Service name, and gets back the ClusterIP. No hardcoded addresses needed.",
    visual: { elementType: 'box', x: 480, y: 450, width: 150, height: 85, style: { fill: '#1a1a30', stroke: '#b388ff', strokeWidth: 2, cornerRadius: 12, fontSize: 12, opacity: 1 }, animation: { type: 'fadeIn', duration: 400, delay: 0 }, icon: '🔍' },
    rlRelevanceScore: 0.6, isExpanded: false, isPresented: false, parentId: 'service', metadata: {},
  },
  'misconception': {
    id: 'misconception', label: 'Pods ≠ Containers', type: 'COUNTERPOINT', depth: 2,
    content: 'Common misconception: a Pod is NOT a container. A Pod can contain multiple containers that share the same network namespace.',
    narration: "A very common mistake: people think Pod and Container are the same thing. They're not. A Pod is a group of one or more containers that share the same network namespace and IP address. Multiple containers in one Pod can talk to each other via localhost.",
    visual: { elementType: 'box', x: 100, y: 280, width: 150, height: 85, style: { fill: '#2a0a15', stroke: '#ff6b9d', strokeWidth: 2, cornerRadius: 12, fontSize: 12, opacity: 1 }, animation: { type: 'fadeIn', duration: 400, delay: 0 }, icon: '⚠️' },
    rlRelevanceScore: 0.75, isExpanded: false, isPresented: false, parentId: 'pod', metadata: {},
  },
};

export const DEMO_EDGES: Record<string, KGEdge> = {
  'e1': { id: 'e1', sourceId: 'root', targetId: 'pod', label: 'contains', type: 'CONTAINS', weight: 1.0, isPresented: false },
  'e2': { id: 'e2', sourceId: 'root', targetId: 'service', label: 'contains', type: 'CONTAINS', weight: 1.0, isPresented: false },
  'e3': { id: 'e3', sourceId: 'root', targetId: 'ingress', label: 'contains', type: 'CONTAINS', weight: 0.9, isPresented: false },
  'e4': { id: 'e4', sourceId: 'service', targetId: 'pod', label: 'routes traffic to', type: 'RELATES_TO', weight: 1.0, isPresented: false },
  'e5': { id: 'e5', sourceId: 'ingress', targetId: 'service', label: 'exposes', type: 'REQUIRES', weight: 0.9, isPresented: false },
  'e6': { id: 'e6', sourceId: 'service', targetId: 'phone-book', label: 'analogous to', type: 'RELATES_TO', weight: 0.7, isPresented: false },
  'e7': { id: 'e7', sourceId: 'service', targetId: 'iptables', label: 'implemented via', type: 'LEADS_TO', weight: 0.7, isPresented: false },
  'e8': { id: 'e8', sourceId: 'service', targetId: 'coredns', label: 'discovered via', type: 'REQUIRES', weight: 0.7, isPresented: false },
  'e9': { id: 'e9', sourceId: 'pod', targetId: 'misconception', label: 'commonly confused', type: 'CONTRADICTS', weight: 0.8, isPresented: false },
};

// ── Visual Scripts for Frame-Based Rendering ──────────────────

const SCENE_1_VISUAL_SCRIPT: VisualScript = {
  sceneId: 'scene-1',
  totalDuration: 8000,
  entities: {},
  frames: [
    {
      id: 's1-f1', startTime: 0, endTime: 3500,
      narrationSegment: "Let's explore Kubernetes Networking — the foundational system",
      description: 'Central concept appears',
      entities: [
        {
          id: 'k8s-net', type: 'Concept', label: 'K8s Networking',
          position: { x: 50, y: 45 }, size: { width: 70, height: 70 },
          color: '#00e5ff',
          animation: { type: 'scaleIn', duration: 600, delay: 0 },
        },
      ],
    },
    {
      id: 's1-f2', startTime: 3500, endTime: 6000,
      narrationSegment: 'that enables Pods, Services, and external traffic to communicate',
      description: 'Three pillars appear around the concept',
      entities: [
        {
          id: 'k8s-net', type: 'Concept', label: 'K8s Networking',
          position: { x: 50, y: 30 }, size: { width: 60, height: 60 },
          color: '#00e5ff',
        },
        {
          id: 'pillar-pod', type: 'Pod', label: 'Pods',
          position: { x: 22, y: 65 }, size: { width: 45, height: 45 },
          color: '#00e676',
          animation: { type: 'fadeIn', duration: 400, delay: 0 },
        },
        {
          id: 'pillar-svc', type: 'Service', label: 'Services',
          position: { x: 50, y: 65 }, size: { width: 45, height: 45 },
          color: '#ffab00',
          animation: { type: 'fadeIn', duration: 400, delay: 200 },
        },
        {
          id: 'pillar-ext', type: 'Cloud', label: 'External Traffic',
          position: { x: 78, y: 65 }, size: { width: 45, height: 45 },
          color: '#00bcd4',
          animation: { type: 'fadeIn', duration: 400, delay: 400 },
        },
      ],
    },
    {
      id: 's1-f3', startTime: 6000, endTime: 8000,
      narrationSegment: "you'll understand how data flows through a Kubernetes cluster",
      description: 'Arrows connect pillars to concept, showing flow',
      entities: [
        {
          id: 'k8s-net', type: 'Concept', label: 'K8s Networking',
          position: { x: 50, y: 30 }, size: { width: 60, height: 60 },
          color: '#00e5ff',
        },
        {
          id: 'pillar-pod', type: 'Pod', label: 'Pods',
          position: { x: 22, y: 65 }, size: { width: 45, height: 45 },
          color: '#00e676',
        },
        {
          id: 'pillar-svc', type: 'Service', label: 'Services',
          position: { x: 50, y: 65 }, size: { width: 45, height: 45 },
          color: '#ffab00',
        },
        {
          id: 'pillar-ext', type: 'Cloud', label: 'External Traffic',
          position: { x: 78, y: 65 }, size: { width: 45, height: 45 },
          color: '#00bcd4',
        },
        {
          id: 'arrow-1', type: 'Arrow', label: '',
          position: { x: 36, y: 48 }, size: { width: 120, height: 0 },
          color: '#ffffff30',
          animation: { type: 'fadeIn', duration: 300, delay: 0 },
        },
        {
          id: 'arrow-2', type: 'Arrow', label: '',
          position: { x: 50, y: 48 }, size: { width: 20, height: 0 },
          color: '#ffffff30',
          animation: { type: 'fadeIn', duration: 300, delay: 150 },
        },
        {
          id: 'arrow-3', type: 'Arrow', label: '',
          position: { x: 64, y: 48 }, size: { width: 120, height: 0 },
          color: '#ffffff30',
          animation: { type: 'fadeIn', duration: 300, delay: 300 },
        },
      ],
    },
  ],
};

const SCENE_2_VISUAL_SCRIPT: VisualScript = {
  sceneId: 'scene-2',
  totalDuration: 12000,
  entities: {},
  frames: [
    {
      id: 's2-f1', startTime: 0, endTime: 5000,
      narrationSegment: 'A Pod is the fundamental building block — a wrapper around containers with its own IP',
      description: 'Single Pod with container inside',
      entities: [
        {
          id: 'pod-main', type: 'Pod', label: 'Pod',
          position: { x: 50, y: 40 }, size: { width: 70, height: 70 },
          color: '#00e676',
          animation: { type: 'scaleIn', duration: 500, delay: 0 },
        },
        {
          id: 'container-1', type: 'Container', label: 'Container',
          position: { x: 50, y: 60 }, size: { width: 40, height: 40 },
          color: '#4caf50',
          animation: { type: 'fadeIn', duration: 400, delay: 300 },
        },
        {
          id: 'ip-label', type: 'Label', label: 'IP: 10.244.0.5',
          position: { x: 50, y: 78 }, size: { width: 50, height: 20 },
          color: '#00e676',
          animation: { type: 'fadeIn', duration: 300, delay: 600 },
        },
      ],
    },
    {
      id: 's2-f2', startTime: 5000, endTime: 8000,
      narrationSegment: 'Every Pod receives its own unique IP address',
      description: 'Multiple pods shown with different IPs',
      entities: [
        {
          id: 'pod-a', type: 'Pod', label: 'Pod A',
          position: { x: 20, y: 40 }, size: { width: 50, height: 50 },
          color: '#00e676',
          animation: { type: 'fadeIn', duration: 400, delay: 0 },
        },
        {
          id: 'pod-b', type: 'Pod', label: 'Pod B',
          position: { x: 50, y: 40 }, size: { width: 50, height: 50 },
          color: '#00e676',
          animation: { type: 'fadeIn', duration: 400, delay: 150 },
        },
        {
          id: 'pod-c', type: 'Pod', label: 'Pod C',
          position: { x: 80, y: 40 }, size: { width: 50, height: 50 },
          color: '#00e676',
          animation: { type: 'fadeIn', duration: 400, delay: 300 },
        },
        {
          id: 'ip-a', type: 'Label', label: '10.244.0.5',
          position: { x: 20, y: 60 }, size: { width: 40, height: 16 },
          color: '#00e676',
        },
        {
          id: 'ip-b', type: 'Label', label: '10.244.0.6',
          position: { x: 50, y: 60 }, size: { width: 40, height: 16 },
          color: '#00e676',
        },
        {
          id: 'ip-c', type: 'Label', label: '10.244.0.7',
          position: { x: 80, y: 60 }, size: { width: 40, height: 16 },
          color: '#00e676',
        },
        {
          id: 'net-line', type: 'Network', label: 'Cluster Network',
          position: { x: 50, y: 75 }, size: { width: 400, height: 0 },
          color: '#ffffff40',
        },
      ],
    },
    {
      id: 's2-f3', startTime: 8000, endTime: 12000,
      narrationSegment: 'A Pod is NOT a container — it can contain multiple containers sharing the same network namespace',
      description: 'Counterpoint: Pod vs Container comparison',
      entities: [
        {
          id: 'comparison', type: 'Comparison', label: 'Pod vs Container',
          position: { x: 50, y: 35 }, size: { width: 70, height: 50 },
          color: '#ff6b9d',
          animation: { type: 'scaleIn', duration: 400, delay: 0 },
        },
        {
          id: 'pod-multi', type: 'Pod', label: 'Pod (group)',
          position: { x: 30, y: 65 }, size: { width: 55, height: 55 },
          color: '#00e676',
          animation: { type: 'fadeIn', duration: 400, delay: 200 },
        },
        {
          id: 'cont-a', type: 'Container', label: 'App',
          position: { x: 60, y: 58 }, size: { width: 30, height: 30 },
          color: '#4caf50',
          animation: { type: 'fadeIn', duration: 300, delay: 400 },
        },
        {
          id: 'cont-b', type: 'Container', label: 'Sidecar',
          position: { x: 60, y: 72 }, size: { width: 30, height: 30 },
          color: '#4caf50',
          animation: { type: 'fadeIn', duration: 300, delay: 550 },
        },
        {
          id: 'shared-label', type: 'Badge', label: 'Shared Network NS',
          position: { x: 75, y: 65 }, size: { width: 40, height: 20 },
          color: '#ff6b9d',
          animation: { type: 'fadeIn', duration: 300, delay: 700 },
        },
      ],
    },
  ],
};

const SCENE_3_VISUAL_SCRIPT: VisualScript = {
  sceneId: 'scene-3',
  totalDuration: 12000,
  entities: {},
  frames: [
    {
      id: 's3-f1', startTime: 0, endTime: 4000,
      narrationSegment: 'A Service solves a critical problem — Pods are ephemeral, a Service gives you a stable IP',
      description: 'Service entity as stable endpoint',
      entities: [
        {
          id: 'svc-main', type: 'Concept', label: 'Service',
          position: { x: 50, y: 40 }, size: { width: 65, height: 65 },
          color: '#ffab00',
          animation: { type: 'scaleIn', duration: 500, delay: 0 },
        },
        {
          id: 'stable-ip', type: 'Badge', label: 'Stable ClusterIP',
          position: { x: 50, y: 65 }, size: { width: 50, height: 20 },
          color: '#ffab00',
          animation: { type: 'fadeIn', duration: 300, delay: 400 },
        },
      ],
    },
    {
      id: 's3-f2', startTime: 4000, endTime: 8000,
      narrationSegment: 'The Service automatically load-balances traffic to healthy Pods',
      description: 'Service routing to multiple Pods',
      entities: [
        {
          id: 'svc-lb', type: 'Service', label: 'Service (LB)',
          position: { x: 25, y: 45 }, size: { width: 55, height: 55 },
          color: '#ffab00',
        },
        {
          id: 'arrow-lb-1', type: 'Arrow', label: '',
          position: { x: 52, y: 30 }, size: { width: 200, height: 0 },
          color: '#ffab0060',
          animation: { type: 'flow', duration: 500, delay: 0 },
        },
        {
          id: 'arrow-lb-2', type: 'Arrow', label: '',
          position: { x: 52, y: 45 }, size: { width: 200, height: 0 },
          color: '#ffab0060',
          animation: { type: 'flow', duration: 500, delay: 150 },
        },
        {
          id: 'arrow-lb-3', type: 'Arrow', label: '',
          position: { x: 52, y: 60 }, size: { width: 200, height: 0 },
          color: '#ffab0060',
          animation: { type: 'flow', duration: 500, delay: 300 },
        },
        {
          id: 'pod-t1', type: 'Pod', label: 'Pod 1',
          position: { x: 78, y: 30 }, size: { width: 40, height: 40 },
          color: '#00e676',
          animation: { type: 'fadeIn', duration: 300, delay: 100 },
        },
        {
          id: 'pod-t2', type: 'Pod', label: 'Pod 2',
          position: { x: 78, y: 50 }, size: { width: 40, height: 40 },
          color: '#00e676',
          animation: { type: 'fadeIn', duration: 300, delay: 250 },
        },
        {
          id: 'pod-t3', type: 'Pod', label: 'Pod 3',
          position: { x: 78, y: 70 }, size: { width: 40, height: 40 },
          color: '#00e676',
          animation: { type: 'fadeIn', duration: 300, delay: 400 },
        },
      ],
    },
    {
      id: 's3-f3', startTime: 8000, endTime: 12000,
      narrationSegment: 'Think of a Service like a phone book — the name stays the same while Pods rotate',
      description: 'Phone book analogy',
      entities: [
        {
          id: 'analogy', type: 'Comparison', label: 'Service = Phone Book',
          position: { x: 50, y: 30 }, size: { width: 70, height: 45 },
          color: '#ffab00',
          animation: { type: 'scaleIn', duration: 400, delay: 0 },
        },
        {
          id: 'name-stable', type: 'Entity', label: 'Name: "my-svc"',
          position: { x: 30, y: 60 }, size: { width: 45, height: 35 },
          color: '#ffab00',
          animation: { type: 'fadeIn', duration: 300, delay: 200 },
        },
        {
          id: 'badge-stable', type: 'Badge', label: 'Always Stable',
          position: { x: 30, y: 78 }, size: { width: 40, height: 18 },
          color: '#00e676',
          animation: { type: 'fadeIn', duration: 300, delay: 400 },
        },
        {
          id: 'pods-rotate', type: 'Cycle', label: 'Pods Rotate',
          position: { x: 70, y: 60 }, size: { width: 45, height: 45 },
          color: '#ff6b9d',
          animation: { type: 'fadeIn', duration: 300, delay: 500 },
        },
        {
          id: 'badge-ephemeral', type: 'Badge', label: 'Ephemeral',
          position: { x: 70, y: 78 }, size: { width: 40, height: 18 },
          color: '#ff6b9d',
          animation: { type: 'fadeIn', duration: 300, delay: 650 },
        },
      ],
    },
  ],
};

const SCENE_4_VISUAL_SCRIPT: VisualScript = {
  sceneId: 'scene-4',
  totalDuration: 13000,
  entities: {},
  frames: [
    {
      id: 's4-f1', startTime: 0, endTime: 5000,
      narrationSegment: 'kube-proxy sets up iptables NAT rules on every node to redirect Service IPs to Pod IPs',
      description: 'iptables process explained',
      entities: [
        {
          id: 'iptables-proc', type: 'Entity', label: 'kube-proxy',
          position: { x: 25, y: 35 }, size: { width: 55, height: 50 },
          color: '#b388ff',
          animation: { type: 'scaleIn', duration: 500, delay: 0 },
        },
        {
          id: 'arrow-ipt', type: 'Arrow', label: 'programs',
          position: { x: 50, y: 35 }, size: { width: 150, height: 0 },
          color: '#b388ff60',
          animation: { type: 'flow', duration: 400, delay: 300 },
        },
        {
          id: 'nat-rules', type: 'Stack', label: 'iptables NAT',
          position: { x: 75, y: 35 }, size: { width: 50, height: 50 },
          color: '#b388ff',
          animation: { type: 'fadeIn', duration: 400, delay: 500 },
        },
        {
          id: 'desc-label', type: 'Label', label: 'Service IP → Pod IP',
          position: { x: 50, y: 65 }, size: { width: 60, height: 20 },
          color: '#b388ff',
          animation: { type: 'fadeIn', duration: 300, delay: 700 },
        },
      ],
    },
    {
      id: 's4-f2', startTime: 5000, endTime: 9000,
      narrationSegment: 'CoreDNS provides DNS-based discovery so Pods can find Services by name',
      description: 'CoreDNS resolution flow',
      entities: [
        {
          id: 'pod-dns', type: 'Pod', label: 'Pod',
          position: { x: 18, y: 45 }, size: { width: 45, height: 45 },
          color: '#00e676',
          animation: { type: 'fadeIn', duration: 400, delay: 0 },
        },
        {
          id: 'arrow-dns-q', type: 'Arrow', label: 'DNS query',
          position: { x: 38, y: 45 }, size: { width: 150, height: 0 },
          color: '#b388ff60',
          animation: { type: 'flow', duration: 400, delay: 200 },
        },
        {
          id: 'coredns-ent', type: 'Database', label: 'CoreDNS',
          position: { x: 55, y: 45 }, size: { width: 50, height: 50 },
          color: '#b388ff',
          animation: { type: 'scaleIn', duration: 400, delay: 100 },
        },
        {
          id: 'arrow-dns-r', type: 'Arrow', label: 'ClusterIP',
          position: { x: 72, y: 45 }, size: { width: 150, height: 0 },
          color: '#00e67660',
          animation: { type: 'flow', duration: 400, delay: 400 },
        },
        {
          id: 'svc-target', type: 'Service', label: 'Service',
          position: { x: 88, y: 45 }, size: { width: 45, height: 45 },
          color: '#ffab00',
          animation: { type: 'fadeIn', duration: 400, delay: 500 },
        },
      ],
    },
    {
      id: 's4-f3', startTime: 9000, endTime: 13000,
      narrationSegment: 'Together they create a seamless networking layer',
      description: 'Complete routing chain',
      entities: [
        {
          id: 'pod-src', type: 'Pod', label: 'Source Pod',
          position: { x: 12, y: 45 }, size: { width: 40, height: 40 },
          color: '#00e676',
        },
        {
          id: 'step-dns', type: 'Database', label: 'CoreDNS',
          position: { x: 32, y: 45 }, size: { width: 40, height: 40 },
          color: '#b388ff',
        },
        {
          id: 'step-ipt', type: 'Entity', label: 'iptables',
          position: { x: 52, y: 45 }, size: { width: 40, height: 40 },
          color: '#b388ff',
        },
        {
          id: 'svc-dest', type: 'Service', label: 'Service',
          position: { x: 72, y: 45 }, size: { width: 40, height: 40 },
          color: '#ffab00',
        },
        {
          id: 'pod-dest', type: 'Pod', label: 'Dest Pod',
          position: { x: 90, y: 45 }, size: { width: 40, height: 40 },
          color: '#00e676',
        },
        {
          id: 'fl-1', type: 'DataFlow', label: '',
          position: { x: 22, y: 45 }, size: { width: 60, height: 0 },
          color: '#ffffff30',
          animation: { type: 'flow', duration: 300, delay: 0 },
        },
        {
          id: 'fl-2', type: 'DataFlow', label: '',
          position: { x: 42, y: 45 }, size: { width: 60, height: 0 },
          color: '#ffffff30',
          animation: { type: 'flow', duration: 300, delay: 200 },
        },
        {
          id: 'fl-3', type: 'DataFlow', label: '',
          position: { x: 62, y: 45 }, size: { width: 60, height: 0 },
          color: '#ffffff30',
          animation: { type: 'flow', duration: 300, delay: 400 },
        },
        {
          id: 'fl-4', type: 'DataFlow', label: '',
          position: { x: 81, y: 45 }, size: { width: 60, height: 0 },
          color: '#ffffff30',
          animation: { type: 'flow', duration: 300, delay: 600 },
        },
        {
          id: 'layer-label', type: 'Label', label: 'Seamless Networking Layer',
          position: { x: 50, y: 72 }, size: { width: 60, height: 20 },
          color: '#00e5ff',
          animation: { type: 'fadeIn', duration: 400, delay: 800 },
        },
      ],
    },
  ],
};

const SCENE_5_VISUAL_SCRIPT: VisualScript = {
  sceneId: 'scene-5',
  totalDuration: 9000,
  entities: {},
  frames: [
    {
      id: 's5-f1', startTime: 0, endTime: 3500,
      narrationSegment: "The Ingress Controller is your cluster's front door",
      description: 'Cloud representing external traffic',
      entities: [
        {
          id: 'ext-cloud', type: 'Cloud', label: 'Internet',
          position: { x: 50, y: 30 }, size: { width: 65, height: 65 },
          color: '#00bcd4',
          animation: { type: 'scaleIn', duration: 500, delay: 0 },
        },
        {
          id: 'users', type: 'User', label: 'Users',
          position: { x: 25, y: 30 }, size: { width: 40, height: 40 },
          color: '#ffffff',
          animation: { type: 'fadeIn', duration: 400, delay: 300 },
        },
        {
          id: 'http-label', type: 'Label', label: 'HTTP / HTTPS',
          position: { x: 50, y: 58 }, size: { width: 50, height: 20 },
          color: '#00bcd4',
          animation: { type: 'fadeIn', duration: 300, delay: 500 },
        },
      ],
    },
    {
      id: 's5-f2', startTime: 3500, endTime: 6500,
      narrationSegment: 'It manages external HTTP traffic, routing requests to the right Service',
      description: 'Ingress routing to services',
      entities: [
        {
          id: 'ext-cloud-2', type: 'Cloud', label: 'Internet',
          position: { x: 15, y: 35 }, size: { width: 45, height: 45 },
          color: '#00bcd4',
        },
        {
          id: 'arrow-to-ing', type: 'Arrow', label: '',
          position: { x: 33, y: 35 }, size: { width: 100, height: 0 },
          color: '#00bcd460',
          animation: { type: 'flow', duration: 400, delay: 0 },
        },
        {
          id: 'ingress-ent', type: 'Server', label: 'Ingress',
          position: { x: 50, y: 35 }, size: { width: 50, height: 50 },
          color: '#00e5ff',
          animation: { type: 'scaleIn', duration: 400, delay: 100 },
        },
        {
          id: 'arrow-to-svc1', type: 'Arrow', label: '/api',
          position: { x: 67, y: 25 }, size: { width: 120, height: 0 },
          color: '#ffab0060',
          animation: { type: 'flow', duration: 400, delay: 300 },
        },
        {
          id: 'arrow-to-svc2', type: 'Arrow', label: '/web',
          position: { x: 67, y: 45 }, size: { width: 120, height: 0 },
          color: '#ffab0060',
          animation: { type: 'flow', duration: 400, delay: 450 },
        },
        {
          id: 'svc-api', type: 'Service', label: 'API Service',
          position: { x: 85, y: 25 }, size: { width: 40, height: 40 },
          color: '#ffab00',
          animation: { type: 'fadeIn', duration: 300, delay: 400 },
        },
        {
          id: 'svc-web', type: 'Service', label: 'Web Service',
          position: { x: 85, y: 50 }, size: { width: 40, height: 40 },
          color: '#ffab00',
          animation: { type: 'fadeIn', duration: 300, delay: 550 },
        },
      ],
    },
    {
      id: 's5-f3', startTime: 6500, endTime: 9000,
      narrationSegment: 'This is how users access applications running inside the cluster',
      description: 'Full path from user through cluster',
      entities: [
        {
          id: 'user-final', type: 'User', label: 'User',
          position: { x: 8, y: 45 }, size: { width: 35, height: 35 },
          color: '#ffffff',
        },
        {
          id: 'cloud-final', type: 'Cloud', label: 'Internet',
          position: { x: 25, y: 45 }, size: { width: 40, height: 40 },
          color: '#00bcd4',
        },
        {
          id: 'ingress-final', type: 'Server', label: 'Ingress',
          position: { x: 45, y: 45 }, size: { width: 40, height: 40 },
          color: '#00e5ff',
        },
        {
          id: 'service-final', type: 'Service', label: 'Service',
          position: { x: 65, y: 45 }, size: { width: 40, height: 40 },
          color: '#ffab00',
        },
        {
          id: 'pod-final', type: 'Pod', label: 'Pod',
          position: { x: 85, y: 45 }, size: { width: 40, height: 40 },
          color: '#00e676',
        },
        {
          id: 'flow-a', type: 'DataFlow', label: '',
          position: { x: 16, y: 45 }, size: { width: 50, height: 0 },
          color: '#ffffff30',
          animation: { type: 'flow', duration: 300, delay: 0 },
        },
        {
          id: 'flow-b', type: 'DataFlow', label: '',
          position: { x: 35, y: 45 }, size: { width: 60, height: 0 },
          color: '#ffffff30',
          animation: { type: 'flow', duration: 300, delay: 200 },
        },
        {
          id: 'flow-c', type: 'DataFlow', label: '',
          position: { x: 55, y: 45 }, size: { width: 60, height: 0 },
          color: '#ffffff30',
          animation: { type: 'flow', duration: 300, delay: 400 },
        },
        {
          id: 'flow-d', type: 'DataFlow', label: '',
          position: { x: 75, y: 45 }, size: { width: 60, height: 0 },
          color: '#ffffff30',
          animation: { type: 'flow', duration: 300, delay: 600 },
        },
        {
          id: 'path-label', type: 'Label', label: 'Complete Request Path',
          position: { x: 50, y: 72 }, size: { width: 60, height: 20 },
          color: '#00e5ff',
          animation: { type: 'fadeIn', duration: 400, delay: 800 },
        },
      ],
    },
  ],
};

// ── Scenes ──────────────────────────────────────────────────

export const DEMO_SCENES: PresentationScene[] = [
  {
    id: 'scene-1', nodeIds: ['root'], edgeIds: [],
    narration: "Let's explore Kubernetes Networking — the foundational system that enables Pods, Services, and external traffic to communicate seamlessly within a cluster. By the end of this presentation, you'll understand how data flows through a Kubernetes cluster.",
    focusNodeId: 'root', viewport: { x: 480, y: 260, zoom: 1.2 },
    visualCommands: [{ type: 'reveal', targetId: 'root', wordTrigger: 0 }], durationEstimate: 8000,
    visualScript: SCENE_1_VISUAL_SCRIPT,
  },
  {
    id: 'scene-2', nodeIds: ['pod', 'misconception'], edgeIds: ['e1', 'e9'],
    narration: "A Pod is the fundamental building block. Think of it as a wrapper around one or more containers. Every Pod receives its own unique IP address. And here's an important distinction: a Pod is NOT a container. A Pod can contain multiple containers that share the same network namespace.",
    focusNodeId: 'pod', viewport: { x: 200, y: 200, zoom: 1.1 },
    visualCommands: [
      { type: 'reveal', targetId: 'pod', wordTrigger: 0 },
      { type: 'reveal', targetId: 'misconception', wordTrigger: 30 },
      { type: 'connect', targetId: 'e9', wordTrigger: 32 },
    ], durationEstimate: 12000,
    visualScript: SCENE_2_VISUAL_SCRIPT,
  },
  {
    id: 'scene-3', nodeIds: ['service', 'phone-book'], edgeIds: ['e2', 'e4', 'e6'],
    narration: "A Service solves a critical problem: Pods are ephemeral — they come and go. A Service gives you a stable IP and DNS name. Think of it like a phone book: the name stays the same even if the actual Pods behind it change. The Service automatically load-balances traffic to healthy Pods.",
    focusNodeId: 'service', viewport: { x: 600, y: 200, zoom: 1.0 },
    visualCommands: [
      { type: 'reveal', targetId: 'service', wordTrigger: 0 },
      { type: 'connect', targetId: 'e4', wordTrigger: 15 },
      { type: 'reveal', targetId: 'phone-book', wordTrigger: 25 },
    ], durationEstimate: 12000,
    visualScript: SCENE_3_VISUAL_SCRIPT,
  },
  {
    id: 'scene-4', nodeIds: ['iptables', 'coredns'], edgeIds: ['e7', 'e8'],
    narration: "Under the hood, two key mechanisms make Services work. First, kube-proxy sets up iptables NAT rules on every node to redirect Service IPs to actual Pod IPs. Second, CoreDNS provides DNS-based discovery so Pods can find Services by name. Together, they create a seamless networking layer.",
    focusNodeId: 'iptables', viewport: { x: 350, y: 400, zoom: 1.0 },
    visualCommands: [
      { type: 'reveal', targetId: 'iptables', wordTrigger: 5 },
      { type: 'reveal', targetId: 'coredns', wordTrigger: 22 },
      { type: 'connect', targetId: 'e7', wordTrigger: 8 },
      { type: 'connect', targetId: 'e8', wordTrigger: 25 },
    ], durationEstimate: 13000,
    visualScript: SCENE_4_VISUAL_SCRIPT,
  },
  {
    id: 'scene-5', nodeIds: ['ingress'], edgeIds: ['e3', 'e5'],
    narration: "Finally, the Ingress Controller is your cluster's front door. It manages external HTTP traffic, routing requests to the right Service based on hostnames and URL paths. This is how your users access applications running inside the cluster.",
    focusNodeId: 'ingress', viewport: { x: 480, y: 100, zoom: 1.1 },
    visualCommands: [
      { type: 'reveal', targetId: 'ingress', wordTrigger: 0 },
      { type: 'connect', targetId: 'e5', wordTrigger: 10 },
    ], durationEstimate: 9000,
    visualScript: SCENE_5_VISUAL_SCRIPT,
  },
];
