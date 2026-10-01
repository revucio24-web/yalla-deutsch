type Props = {
  value: number;
};

export default function MasteryIndicator({ value }: Props) {
  return (
    <div
      className="mastery-dots"
      role="meter"
      aria-label="Lernstand"
      aria-valuemin={0}
      aria-valuemax={5}
      aria-valuenow={value}
      aria-valuetext={`${value} von 5`}
      lang="de"
    >
      <span className="mastery-value" aria-hidden="true">{value}/5</span>
      {[1, 2, 3, 4, 5].map((level) => (
        <i key={level} aria-hidden="true" className={level <= value ? 'filled' : ''} />
      ))}
    </div>
  );
}
