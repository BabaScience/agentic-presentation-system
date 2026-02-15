/* ═══════════════════════════════════════════════════════════════
   Demo Knowledge Graph — Kubernetes Networking
   Embedded fallback for when backend is unavailable
   ═══════════════════════════════════════════════════════════════ */

import type { KGNode, KGEdge, PresentationScene } from '../stores/sessionStore';

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

export const DEMO_SCENES: PresentationScene[] = [
  {
    id: 'scene-1', nodeIds: ['root'], edgeIds: [],
    narration: "Let's explore Kubernetes Networking — the foundational system that enables Pods, Services, and external traffic to communicate seamlessly within a cluster. By the end of this presentation, you'll understand how data flows through a Kubernetes cluster.",
    focusNodeId: 'root', viewport: { x: 480, y: 260, zoom: 1.2 },
    visualCommands: [{ type: 'reveal', targetId: 'root', wordTrigger: 0 }], durationEstimate: 8000,
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
  },
  {
    id: 'scene-5', nodeIds: ['ingress'], edgeIds: ['e3', 'e5'],
    narration: "Finally, the Ingress Controller is your cluster's front door. It manages external HTTP traffic, routing requests to the right Service based on hostnames and URL paths. This is how your users access applications running inside the cluster.",
    focusNodeId: 'ingress', viewport: { x: 480, y: 100, zoom: 1.1 },
    visualCommands: [
      { type: 'reveal', targetId: 'ingress', wordTrigger: 0 },
      { type: 'connect', targetId: 'e5', wordTrigger: 10 },
    ], durationEstimate: 9000,
  },
];
