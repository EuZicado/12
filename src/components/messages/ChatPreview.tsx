import { BadgeCheck, Mic } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface ChatPreviewProps {
  id: string;
  username: string;
  displayName: string;
  avatar?: string;
  lastMessage: string;
  timestamp: string;
  unreadCount?: number;
  isOnline?: boolean;
  isVerified?: boolean;
  verificationBadge?: "blue" | "gold" | "staff" | "none";
  onClick: () => void;
  index?: number;
}

export const ChatPreview = ({
  displayName,
  avatar,
  lastMessage,
  timestamp,
  unreadCount = 0,
  isOnline,
  isVerified,
  verificationBadge = "blue",
  onClick,
  index = 0,
}: ChatPreviewProps) => {
  const getBadgeColor = () => {
    switch (verificationBadge) {
      case "gold":
        return "text-warning";
      case "staff":
        return "text-accent";
      default:
        return "text-blue-500";
    }
  };

  const isAudioMessage = lastMessage.includes("🎤");

  return (
    <motion.button
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.03 }}
      onClick={onClick}
      className="chat-item"
    >
      {/* Avatar */}
      <div className="relative flex-shrink-0">
        <Avatar className="w-14 h-14">
          <AvatarImage src={avatar} alt={displayName} className="object-cover" />
          <AvatarFallback className="bg-secondary text-lg font-semibold">
            {displayName?.[0]?.toUpperCase() || "?"}
          </AvatarFallback>
        </Avatar>
        {isOnline && (
          <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-success border-2 border-background" />
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 text-left">
        <div className="flex items-center gap-1.5">
          <span className="font-semibold text-foreground truncate">{displayName}</span>
          {isVerified && (
            <BadgeCheck className={cn("w-4 h-4 flex-shrink-0", getBadgeColor())} />
          )}
        </div>
        <div className={cn(
          "flex items-center gap-1 mt-0.5",
          unreadCount > 0 ? "text-foreground" : "text-muted-foreground"
        )}>
          {isAudioMessage && <Mic className="w-3.5 h-3.5 flex-shrink-0" />}
          <p className={cn(
            "text-sm truncate",
            unreadCount > 0 && "font-medium"
          )}>
            {lastMessage || "Nenhuma mensagem"}
          </p>
        </div>
      </div>

      {/* Meta */}
      <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
        {timestamp && (
          <span className={cn(
            "text-xs",
            unreadCount > 0 ? "text-primary font-medium" : "text-muted-foreground"
          )}>
            {timestamp}
          </span>
        )}
        {unreadCount > 0 && (
          <motion.div 
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="min-w-[20px] h-5 px-1.5 rounded-full bg-primary flex items-center justify-center"
          >
            <span className="text-[10px] font-bold text-primary-foreground">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          </motion.div>
        )}
      </div>
    </motion.button>
  );
};
