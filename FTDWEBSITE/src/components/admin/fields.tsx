import type { ReactNode } from 'react';

/** Plain form fields for admin pages (server-renderable). */

export function Field({
  name,
  label,
  value,
  required,
  hint,
  type = 'text',
  placeholder,
  inputMode,
}: {
  name: string;
  label: string;
  value?: string | number | null;
  required?: boolean;
  hint?: string;
  type?: 'text' | 'url' | 'number';
  placeholder?: string;
  inputMode?: 'numeric' | 'decimal' | 'url';
}) {
  const id = `f-${name}`;
  return (
    <div className="field">
      <label className="field__label" htmlFor={id}>
        {label}
        {required ? <span className="adm-req"> *</span> : null}
      </label>
      <input
        id={id}
        className="input"
        name={name}
        type={type === 'number' ? 'text' : type}
        inputMode={type === 'number' ? 'numeric' : inputMode}
        defaultValue={value ?? ''}
        required={required}
        placeholder={placeholder}
        autoComplete="off"
      />
      {hint ? <p className="field__hint">{hint}</p> : null}
    </div>
  );
}

export function TextArea({
  name,
  label,
  value,
  required,
  hint,
  rows = 4,
}: {
  name: string;
  label: string;
  value?: string | null;
  required?: boolean;
  hint?: string;
  rows?: number;
}) {
  const id = `f-${name}`;
  return (
    <div className="field adm-span-2">
      <label className="field__label" htmlFor={id}>
        {label}
        {required ? <span className="adm-req"> *</span> : null}
      </label>
      <textarea id={id} className="input adm-textarea" name={name} defaultValue={value ?? ''} required={required} rows={rows} />
      {hint ? <p className="field__hint">{hint}</p> : null}
    </div>
  );
}

export function Select({
  name,
  label,
  value,
  options,
  required,
  hint,
  disabled,
}: {
  name: string;
  label: string;
  value?: string | null;
  options: { value: string; label: string }[];
  required?: boolean;
  hint?: string;
  disabled?: boolean;
}) {
  const id = `f-${name}`;
  return (
    <div className="field">
      <label className="field__label" htmlFor={id}>
        {label}
        {required ? <span className="adm-req"> *</span> : null}
      </label>
      <select id={id} className="select" name={disabled ? undefined : name} defaultValue={value ?? ''} required={required} disabled={disabled}>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      {/* Disabled selects don't submit — send the locked value explicitly. */}
      {disabled ? <input type="hidden" name={name} value={value ?? ''} /> : null}
      {hint ? <p className="field__hint">{hint}</p> : null}
    </div>
  );
}

export function Checkbox({ name, label, checked }: { name: string; label: string; checked?: boolean }) {
  return (
    <label className="checkbox adm-checkbox">
      <input type="checkbox" name={name} defaultChecked={checked} />
      {label}
    </label>
  );
}

export function FormGrid({ children }: { children: ReactNode }) {
  return <div className="adm-grid">{children}</div>;
}

export function Panel({
  title,
  description,
  action,
  children,
}: {
  title?: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="adm-panel">
      {title || action ? (
        <header className="adm-panel__head">
          <div>
            {title ? <h2 className="adm-panel__title">{title}</h2> : null}
            {description ? <p className="adm-panel__desc">{description}</p> : null}
          </div>
          {action}
        </header>
      ) : null}
      {children}
    </section>
  );
}

export function PageTitle({ eyebrow, title, description, action }: { eyebrow: string; title: string; description?: string; action?: ReactNode }) {
  return (
    <header className="adm-title">
      <div>
        <p className="adm-title__eyebrow">{eyebrow}</p>
        <h1 className="adm-title__h">{title}</h1>
        {description ? <p className="adm-title__desc">{description}</p> : null}
      </div>
      {action ? <div className="adm-title__action">{action}</div> : null}
    </header>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <p className="adm-empty">{children}</p>;
}
