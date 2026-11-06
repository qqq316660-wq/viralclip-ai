import React from 'react';
import { Check } from '@phosphor-icons/react';

export default function StepBar({ currentStep, onSelectStep, maxUnlockedStep }) {
  const steps = [
    { number: 1, label: 'Ingest Media' },
    { number: 2, label: 'Repurpose Specs' },
    { number: 3, label: 'Neural Engine' },
    { number: 4, label: 'Viral Shorts' }
  ];

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '8px',
        marginBottom: '28px',
        flexWrap: 'wrap'
      }}
    >
      {steps.map((step) => {
        const isActive = currentStep === step.number;
        const isCompleted = step.number < currentStep;
        const isClickable = step.number <= maxUnlockedStep;

        let bg = 'rgba(255, 255, 255, 0.04)';
        let textColor = 'var(--text-subdued)';
        let border = '1px solid var(--border-subtle)';
        let circleBg = '#282828';
        let circleColor = 'var(--text-subdued)';

        if (isActive) {
          bg = '#242424';
          textColor = '#ffffff';
          border = '1px solid var(--spotify-green)';
          circleBg = 'var(--spotify-green)';
          circleColor = '#000000';
        } else if (isCompleted) {
          bg = 'rgba(30, 215, 96, 0.08)';
          textColor = '#ffffff';
          border = '1px solid rgba(30, 215, 96, 0.3)';
          circleBg = 'var(--spotify-green)';
          circleColor = '#000000';
        }

        return (
          <button
            key={step.number}
            type="button"
            disabled={!isClickable}
            onClick={() => onSelectStep(step.number)}
            style={{
              background: bg,
              color: textColor,
              border: border,
              borderRadius: 'var(--radius-full)',
              padding: '6px 16px 6px 8px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '13px',
              fontFamily: 'var(--font-body)',
              fontWeight: 700,
              cursor: isClickable ? 'pointer' : 'default',
              transition: 'all 0.15s ease',
              opacity: isClickable ? 1 : 0.4
            }}
          >
            <div
              style={{
                width: '22px',
                height: '22px',
                borderRadius: 'var(--radius-circle)',
                background: circleBg,
                color: circleColor,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '11px',
                fontWeight: 800
              }}
            >
              {isCompleted ? <Check size={12} weight="bold" /> : step.number}
            </div>
            <span>{step.label}</span>
          </button>
        );
      })}
    </div>
  );
}
