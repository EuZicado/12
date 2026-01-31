import { ArrowLeft, MoreVertical, Phone, Video } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { TypingIndicator } from "./TypingIndicator";

interface ChatHeaderProps {
  displayName: string | null;
  username: string | null;
  avatarUrl: string | null;
  isOnline: boolean;
  isTyping: boolean;
  onBack: () => void;
}

export const ChatHeader = ({
  displayName,
  username,
  avatarUrl,
  isOnline,
  isTyping,
  onBack,
}: ChatHeaderProps) => {
  return (
    <header className="glass-strong border-b border-white/5 px-4 py-3 safe-top">
      <div className="flex items-center gap-3">
        <button
          onClick={onBack}
          className="p-2 -ml-2 rounded-full hover:bg-muted/50 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        
        <div className="relative">
          <Avatar className="w-10 h-10">
            <AvatarImage src={avatarUrl || undefined} />
            <AvatarFallback>
              {(displayName || "U")[0].toUpperCase()}
            </AvatarFallback>
          </Avatar>
          {isOnline && (
            <div className="absolute bottom-0 right-0 w-3 h-3 bg-success rounded-full border-2 border-background" />
          )}
        </div>
        
        <div className="flex-1">
          <p className="font-medium">{displayName || username || "Usuário"}</p>
          {isTyping ? (
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-primary">Digitando</span>
              <TypingIndicator className="scale-75 origin-left" />
            </div>
          ) : isOnline ? (
            <p className="text-xs text-success">Online</p>
          ) : (
            <p className="text-xs text-muted-foreground">@{username || "unknown"}</p>
          )}
        </div>

        <div className="flex items-center gap-1">
          <button className="p-2 rounded-full hover:bg-muted/50 transition-colors">
            <Phone className="w-5 h-5 text-muted-foreground" />
          </button>
          <button className="p-2 rounded-full hover:bg-muted/50 transition-colors">
            <Video className="w-5 h-5 text-muted-foreground" />
          </button>
          <button className="p-2 rounded-full hover:bg-muted/50 transition-colors">
            <MoreVertical className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>
      </div>
    </header>
  );
};
