export class MessageResponseDto {
  id!: string;
  text!: string;
  createdAt!: Date;
  user!: {
    id: string;
    displayName: string;
    avatarUrl: string | null;
  };
  replyTo?: {
    id: string;
    text: string;
    user: {
      displayName: string;
    };
  } | null;

  constructor(partial: Partial<MessageResponseDto>) {
    Object.assign(this, partial);
  }
}
