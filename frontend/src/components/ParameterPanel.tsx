/* ═══════════════════════════════════════════════════════════════
   ParameterPanel — Reactive controls that call env.setParameter
   on change. Zero API round-trip for visual update (Law 2).
   ═══════════════════════════════════════════════════════════════ */

import { useState, useEffect } from 'react';
import { useStageEngine } from '../engine/StageEngineContext';
import { useSessionStore } from '../stores/sessionStore';
import type { ParameterDefinition } from '@shared/types';

interface ParameterPanelProps {
  parameters: ParameterDefinition[];
  /** When null, show empty panel. When provided, filter by interactiveParameters or show all. */
  currentScene: { interactiveParameters?: string[] } | null;
}

export function ParameterPanel({ parameters, currentScene }: ParameterPanelProps) {
  const { env } = useStageEngine();
  const sendSetParameter = useSessionStore((s) => s.sendSetParameter);

  // Show nothing when no scene active; filter by interactiveParameters when provided
  const visibleParams = !currentScene
    ? []
    : (currentScene.interactiveParameters?.length
        ? parameters.filter((p) => currentScene!.interactiveParameters!.includes(p.name))
        : parameters);

  if (visibleParams.length === 0) return null;

  return (
    <div className="parameter-panel">
      <div className="parameter-panel-title">Controls</div>
      {visibleParams.map((p) => (
        <ParameterControl
          key={p.name}
          param={p}
          env={env}
          sendSetParameter={sendSetParameter}
        />
      ))}
    </div>
  );
}

function ParameterControl({
  param,
  env,
  sendSetParameter,
}: {
  param: ParameterDefinition;
  env: ReturnType<typeof useStageEngine>['env'];
  sendSetParameter: (name: string, value: unknown) => void;
}) {
  const current = env.getParameter(param.name);
  if (!current) return null;

  const label = param.label ?? param.name;
  const min = param.min ?? 0;
  const max = param.max ?? 100;
  const step = param.type === 'integer' ? 1 : 0.01;

  if (param.type === 'integer' || param.type === 'float') {
    return (
      <RangeControl
        name={param.name}
        label={label}
        min={min}
        max={max}
        step={step}
        defaultVal={(param.default as number) ?? min}
        env={env}
        sendSetParameter={sendSetParameter}
      />
    );
  }

  if (param.type === 'boolean') {
    return (
      <BooleanControl
        name={param.name}
        label={label}
        defaultVal={(param.default as boolean) ?? false}
        env={env}
        sendSetParameter={sendSetParameter}
      />
    );
  }

  if (param.type === 'string') {
    return (
      <StringControl
        name={param.name}
        label={label}
        defaultVal={(param.default as string) ?? ''}
        env={env}
        sendSetParameter={sendSetParameter}
      />
    );
  }

  if (param.type === 'enum' && (param.options?.length || param.enumValues?.length)) {
    const opts = param.options ?? param.enumValues ?? [];
    return (
      <EnumControl
        name={param.name}
        label={label}
        options={opts}
        defaultVal={(param.default as string) ?? opts[0]}
        env={env}
        sendSetParameter={sendSetParameter}
      />
    );
  }

  return null;
}

function RangeControl({
  name,
  label,
  min,
  max,
  step,
  defaultVal,
  env,
  sendSetParameter,
}: {
  name: string;
  label: string;
  min: number;
  max: number;
  step: number;
  defaultVal: number;
  env: ReturnType<typeof useStageEngine>['env'];
  sendSetParameter: (name: string, value: unknown) => void;
}) {
  const [value, setValue] = useState(() => {
    const p = env.getParameter(name);
    return (p?.value as number) ?? defaultVal;
  });

  // Sync from engine when param is redefined (e.g. checkpoint restore)
  useEffect(() => {
    const p = env.getParameter(name);
    if (p != null) setValue((p.value as number) ?? defaultVal);
  }, [env, name, defaultVal]);

  const handleChange = (newVal: number) => {
    setValue(newVal);
    env.setParameter(name, newVal);
    sendSetParameter(name, newVal);
  };

  return (
    <div className="parameter-control">
      <label>
        <span className="parameter-label">{label}</span>
        <span className="parameter-value">{value}</span>
      </label>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => handleChange(Number(e.target.value))}
      />
    </div>
  );
}

function BooleanControl({
  name,
  label,
  defaultVal,
  env,
  sendSetParameter,
}: {
  name: string;
  label: string;
  defaultVal: boolean;
  env: ReturnType<typeof useStageEngine>['env'];
  sendSetParameter: (name: string, value: unknown) => void;
}) {
  const [value, setValue] = useState(() => {
    const p = env.getParameter(name);
    return (p?.value as boolean) ?? defaultVal;
  });

  useEffect(() => {
    const p = env.getParameter(name);
    if (p != null) setValue((p.value as boolean) ?? defaultVal);
  }, [env, name, defaultVal]);

  const handleChange = (checked: boolean) => {
    setValue(checked);
    env.setParameter(name, checked);
    sendSetParameter(name, checked);
  };

  return (
    <div className="parameter-control">
      <label>
        <input
          type="checkbox"
          checked={value}
          onChange={(e) => handleChange(e.target.checked)}
        />
        <span className="parameter-label">{label}</span>
      </label>
    </div>
  );
}

function StringControl({
  name,
  label,
  defaultVal,
  env,
  sendSetParameter,
}: {
  name: string;
  label: string;
  defaultVal: string;
  env: ReturnType<typeof useStageEngine>['env'];
  sendSetParameter: (name: string, value: unknown) => void;
}) {
  const [value, setValue] = useState(() => {
    const p = env.getParameter(name);
    return (p?.value as string) ?? defaultVal;
  });

  useEffect(() => {
    const p = env.getParameter(name);
    if (p != null) setValue((p.value as string) ?? defaultVal);
  }, [env, name, defaultVal]);

  const handleChange = (newVal: string) => {
    setValue(newVal);
    env.setParameter(name, newVal);
    sendSetParameter(name, newVal);
  };

  return (
    <div className="parameter-control">
      <label>
        <span className="parameter-label">{label}</span>
      </label>
      <input
        type="text"
        value={value}
        onChange={(e) => handleChange(e.target.value)}
      />
    </div>
  );
}

function EnumControl({
  name,
  label,
  options,
  defaultVal,
  env,
  sendSetParameter,
}: {
  name: string;
  label: string;
  options: string[];
  defaultVal: string;
  env: ReturnType<typeof useStageEngine>['env'];
  sendSetParameter: (name: string, value: unknown) => void;
}) {
  const [value, setValue] = useState(() => {
    const p = env.getParameter(name);
    return (p?.value as string) ?? defaultVal;
  });

  useEffect(() => {
    const p = env.getParameter(name);
    if (p != null) setValue((p.value as string) ?? defaultVal);
  }, [env, name, defaultVal]);

  const handleChange = (newVal: string) => {
    setValue(newVal);
    env.setParameter(name, newVal);
    sendSetParameter(name, newVal);
  };

  return (
    <div className="parameter-control">
      <label>
        <span className="parameter-label">{label}</span>
      </label>
      <select value={value} onChange={(e) => handleChange(e.target.value)}>
        {options.map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </select>
    </div>
  );
}
