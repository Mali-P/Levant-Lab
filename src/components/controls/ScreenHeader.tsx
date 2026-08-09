import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import Icon from '../ornament/Icon';

type Props = {
  title: string;
  eyebrow?: string;
  back?: boolean;
  /**
   * What leaving this screen means, where it means more than one step back.
   *
   * Review's read-through is the case this exists for: backing out of a deck
   * is also the act that forgets it, so the screen has to be told rather than
   * the history walked. Left off, the arrow does what it has always done.
   */
  onBack?: () => void;
  action?: ReactNode;
};

export default function ScreenHeader({
  title,
  eyebrow,
  back,
  onBack,
  action,
}: Props) {
  const navigate = useNavigate();

  return (
    <header className="screen-head">
      {back && (
        <button
          type="button"
          className="btn btn-ghost btn-icon"
          onClick={() => (onBack ? onBack() : navigate(-1))}
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
