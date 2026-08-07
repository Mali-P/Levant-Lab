import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import Icon from '../ornament/Icon';

type Props = {
  title: string;
  eyebrow?: string;
  back?: boolean;
  action?: ReactNode;
};

export default function ScreenHeader({ title, eyebrow, back, action }: Props) {
  const navigate = useNavigate();

  return (
    <header className="screen-head">
      {back && (
        <button
          type="button"
          className="btn btn-ghost btn-icon"
          onClick={() => navigate(-1)}
          aria-label="Go back"
        >
          <Icon name="back" />
        </button>
      )}
      <div className="grow">
        {eyebrow && <div className="eyebrow">{eyebrow}</div>}
        <h1>{title}</h1>
      </div>
      {action}
    </header>
  );
}
