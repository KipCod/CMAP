import { useEffect, useRef, useState } from "react";

interface Props {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  notice: string | null;
}

export function MapKeywordFilter({ value, onChange, onSubmit, notice }: Props) {
  const [noticeVisible, setNoticeVisible] = useState(false);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    if (!notice) {
      setNoticeVisible(false);
      return;
    }
    setNoticeVisible(true);
    if (timerRef.current) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => setNoticeVisible(false), 2200);
    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
    };
  }, [notice]);

  return (
    <div className="map-keyword-filter">
      <label className="maps-toolbar-label map-keyword-label" htmlFor="map-keyword-input">
        MAP keyword
      </label>
      <div className="map-keyword-input-row">
        <input
          id="map-keyword-input"
          type="search"
          className="map-keyword-input"
          placeholder="Filter or jump to keyword… (Enter)"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              onSubmit();
            }
          }}
          aria-label="MAP keyword filter"
        />
        <button type="button" className="map-keyword-go" onClick={onSubmit} title="Jump to keyword">
          Go
        </button>
      </div>
      {noticeVisible && notice && (
        <div className="map-keyword-notice" role="status">
          {notice}
        </div>
      )}
    </div>
  );
}
