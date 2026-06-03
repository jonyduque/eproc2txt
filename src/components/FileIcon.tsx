import React from 'react';

interface FileIconProps {
  status: string;
  ext: string;
}

export default function FileIcon({ status, ext }: FileIconProps) {
  let stateClass = '';
  if (status === 'done') {
    stateClass = 'status-done';
  } else if (status === 'processing') {
    stateClass = 'status-processing';
  }

  return (
    <span className={`material-icons file-icon-material ${stateClass}`}>
      {ext === 'html' ? 'code' : 'description'}
    </span>
  );
}
