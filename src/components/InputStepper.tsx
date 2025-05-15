import React from "react";

type InputStepperProps = {
  id: string;
  label: string;
  mu?: string;
  value: number;
  onDownClick: () => void;
  onUpClick: () => void;
  onUpdate: (value: number) => void;
} & React.InputHTMLAttributes<HTMLInputElement>;

const InputStepper: React.FC<InputStepperProps> = ({
  id,
  label,
  mu,
  value,
  onDownClick,
  onUpClick,
  onUpdate,
  ...props
}) => {
  return (
    <div className="input-group">
      <label htmlFor={id}>
        {label} {mu && <span className="mu">{mu}</span>}
      </label>
      <br />
      <div className="input-stepper">
        <button type="button" onClick={onDownClick}>
          −
        </button>
        <input id={id} type="number" value={value} onChange={(e) => onUpdate(Number(e.target.value))} {...props} />
        <button type="button" onClick={onUpClick}>
          +
        </button>
      </div>
    </div>
  );
};

export default InputStepper;
