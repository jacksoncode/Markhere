import { ReactNode } from 'react';

interface EditorProviderProps {
  children: ReactNode;
}

export function EditorProvider({ children }: EditorProviderProps) {
  return <>{children}</>;
}