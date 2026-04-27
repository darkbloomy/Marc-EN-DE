export interface AvatarOption {
  id: string;
  emoji: string;
  label: string;
}

export const AVATARS: AvatarOption[] = [
  { id: "fox", emoji: "🦊", label: "Fox" },
  { id: "owl", emoji: "🦉", label: "Owl" },
  { id: "dragon", emoji: "🐉", label: "Dragon" },
  { id: "cat", emoji: "🐱", label: "Cat" },
  { id: "dog", emoji: "🐶", label: "Dog" },
  { id: "bear", emoji: "🐻", label: "Bear" },
  { id: "rabbit", emoji: "🐰", label: "Rabbit" },
  { id: "unicorn", emoji: "🦄", label: "Unicorn" },
  { id: "panda", emoji: "🐼", label: "Panda" },
  { id: "tiger", emoji: "🐯", label: "Tiger" },
];

export function getAvatar(id: string): AvatarOption | undefined {
  return AVATARS.find((a) => a.id === id);
}
