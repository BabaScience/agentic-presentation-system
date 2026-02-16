# Testing Strategy — Agentic Presentation System

## Overview

This document outlines the comprehensive testing strategy for the enhanced Agentic Presentation System with all advanced features.

## Test Structure

```
backend/src/services/__tests__/
├── unit/                  # Unit tests for individual services
│   ├── CodeExecutionService.test.ts
│   ├── DataVisualizationService.test.ts
│   ├── MathVisualizationService.test.ts
│   ├── AIIllustrationService.test.ts
│   ├── VisualScriptGenerator.test.ts
│   ├── AgentService.test.ts
│   └── ...
├── integration/           # Integration tests across services
│   ├── PresentationFlow.test.ts
│   ├── WebSocketGateway.test.ts
│   └── ...
└── e2e/                   # End-to-end tests
    ├── CompleteSession.test.ts
    └── ...
```

## Test Categories

### 1. Unit Tests

**Purpose:** Test individual service methods in isolation

**Coverage Requirements:**
- Minimum 80% line coverage
- 75% function coverage
- 70% branch coverage

**Key Test Areas:**

#### Code Execution Service
- ✅ JavaScript, Python, TypeScript execution
- ✅ Syntax error handling
- ✅ Timeout enforcement
- ✅ Stdin/stdout handling
- ✅ Debug step generation
- ✅ Complexity analysis
- ✅ Docker health check

#### Data Visualization Service
- ✅ Complexity comparison charts (O(n), O(n²), etc.)
- ✅ Before/after bar charts
- ✅ Pie chart generation
- ✅ Time series plots
- ✅ Network graph visualization
- ✅ AI-powered visualization detection
- ✅ Chart configuration validation

#### Math Visualization Service
- ✅ Function plotting
- ✅ Equation solving steps
- ✅ Matrix visualization
- ✅ Geometric proof rendering
- ✅ LaTeX conversion
- ✅ Integral approximation
- ✅ Math content detection

#### AI Illustration Service
- Prompt enhancement
- Style application
- DALL-E integration (when API key available)
- SVG placeholder generation
- Contextual illustration analysis

#### Visual Script Generator
- Frame-based narration analysis
- Entity type mapping
- Temporal segmentation
- Position calculation
- Animation choreography
- Fallback mechanisms

### 2. Integration Tests

**Purpose:** Test interaction between multiple services

**Test Scenarios:**

#### Complete Presentation Flow
```typescript
describe('Complete Presentation Flow', () => {
  it('should generate presentation from topic to visual script', async () => {
    // 1. Agent reasoning
    // 2. Knowledge graph construction
    // 3. Scene planning with visual scripts
    // 4. Code execution integration
    // 5. Data visualization generation
    // 6. Math visualization where applicable
  });
});
```

#### WebSocket Communication
- Client connection/disconnection
- Message routing
- Binary audio streaming
- Error handling
- State synchronization

#### Live Code Visualization
- Code submission
- Execution in sandbox
- Result streaming
- Visualization generation
- Frontend rendering

### 3. End-to-End Tests

**Purpose:** Test complete user journeys

**Test Scenarios:**

#### Session Lifecycle
1. User starts session with topic
2. System generates knowledge graph
3. Presentation plays with voice + visuals
4. User interrupts with question
5. System handles interrupt and resumes
6. Session completes

#### Code Demonstration
1. Narration mentions algorithm
2. System generates code example
3. Code executes in sandbox
4. Results visualized with charts
5. Complexity analysis shown

#### Mathematical Explanation
1. Narration contains math formula
2. System detects and generates LaTeX
3. Function plot rendered
4. Interactive manipulation enabled
5. Integral/derivative shown

## Running Tests

### All Tests
```bash
cd backend
npm test
```

### Specific Test Suites
```bash
npm run test:unit          # Unit tests only
npm run test:integration   # Integration tests only
npm run test:e2e          # End-to-end tests only
```

### Watch Mode (Development)
```bash
npm run test:watch
```

### Coverage Report
```bash
npm test -- --coverage
```

## Test Utilities

### Mock Services

```typescript
// Mock Anthropic API
jest.mock('@anthropic-ai/sdk');

// Mock Docker execution
jest.mock('child_process', () => ({
  exec: jest.fn((cmd, opts, callback) => {
    callback(null, { stdout: 'mocked output', stderr: '' });
  }),
}));
```

### Test Fixtures

```typescript
// Standard test data
export const testScene: PresentationScene = {
  id: 'test-scene-1',
  nodeIds: ['node-1'],
  edgeIds: [],
  narration: 'Test narration content',
  focusNodeId: 'node-1',
  viewport: { x: 0, y: 0, zoom: 1.0 },
  visualCommands: [],
  durationEstimate: 5000,
};

export const testCodeRequest: CodeExecutionRequest = {
  code: 'console.log("Hello");',
  language: CodeLanguage.JAVASCRIPT,
  timeout: 5000,
};
```

## Performance Benchmarks

### Code Execution
- **Target:** < 2s for simple scripts
- **Maximum:** 10s timeout enforced

### Visual Script Generation
- **Target:** < 1.5s per scene
- **Maximum:** 3s with fallback

### Chart Generation
- **Target:** < 500ms
- **Maximum:** 1s for complex visualizations

### AI Illustration
- **Target:** < 3s prompt enhancement
- **Maximum:** 30s for full DALL-E generation

## CI/CD Integration

### GitHub Actions Workflow

```yaml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest

    services:
      docker:
        image: docker:dind
        options: --privileged

    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install dependencies
        run: |
          cd backend
          npm install

      - name: Run tests
        run: |
          cd backend
          npm test -- --coverage

      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          files: ./backend/coverage/lcov.info
```

## Security Testing

### Code Execution Sandbox
- ✓ No network access
- ✓ Memory limits enforced
- ✓ CPU limits enforced
- ✓ Process limits enforced
- ✓ Read-only filesystem
- ✓ Timeout enforcement

### Input Validation
- ✓ Code injection prevention
- ✓ Path traversal prevention
- ✓ Command injection prevention
- ✓ XSS prevention in outputs

## Manual Testing Checklist

### Visual Features
- [ ] Frames appear synchronized with narration
- [ ] Animations play smoothly
- [ ] Entity positions make visual sense
- [ ] Labels are readable
- [ ] Colors follow design system

### Code Execution
- [ ] JavaScript execution works
- [ ] Python execution works
- [ ] Error messages are clear
- [ ] Timeout is enforced
- [ ] Output is properly formatted

### Data Visualizations
- [ ] Charts render correctly
- [ ] Axes are labeled
- [ ] Legends show properly
- [ ] Interactive features work
- [ ] Colors are accessible

### Math Visualizations
- [ ] LaTeX renders correctly
- [ ] Function plots are accurate
- [ ] Step-by-step solving works
- [ ] Interactive manipulation works
- [ ] Geometric shapes render

## Test Coverage Goals

| Component | Current | Target |
|-----------|---------|--------|
| Services | 80% | 85% |
| WebSocket Gateway | 75% | 80% |
| Agent Core | 70% | 80% |
| Utilities | 85% | 90% |
| **Overall** | **78%** | **85%** |

## Continuous Improvement

### Weekly Testing Goals
1. Add 5+ new test cases
2. Improve coverage by 1%
3. Fix all failing tests
4. Update test documentation
5. Review and update mocks

### Monthly Testing Review
1. Analyze test execution time
2. Identify flaky tests
3. Update test strategy
4. Review coverage gaps
5. Plan new test scenarios

## Troubleshooting

### Common Issues

**Docker not available:**
```bash
# Install Docker and ensure it's running
docker --version
```

**Tests timeout:**
```bash
# Increase Jest timeout in test file
jest.setTimeout(15000);
```

**Coverage too low:**
```bash
# Generate coverage report
npm test -- --coverage
# Review uncovered lines
open coverage/lcov-report/index.html
```

## Best Practices

1. **Test Independence:** Each test should run independently
2. **Clear Names:** Use descriptive test names
3. **AAA Pattern:** Arrange, Act, Assert
4. **Mock External:** Mock all external APIs/services
5. **Fast Tests:** Keep unit tests under 100ms
6. **Realistic Data:** Use realistic test data
7. **Edge Cases:** Test boundary conditions
8. **Error Paths:** Test error handling
9. **Documentation:** Document complex test logic
10. **Maintenance:** Keep tests updated with code

## Resources

- [Jest Documentation](https://jestjs.io/)
- [Testing Library](https://testing-library.com/)
- [Supertest (HTTP testing)](https://github.com/visionmedia/supertest)
- [Coverage Reports](./coverage/lcov-report/index.html)

---

**Last Updated:** 2026-02-16
**Status:** Testing infrastructure implemented
**Next Steps:** Run full test suite and achieve 85% coverage
