import { useState } from "react";
import { motion } from "framer-motion";
import { Calendar, ArrowRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface Announcement {
  id: string;
  title: string;
  description: string;
  content?: string;
  image_url?: string;
  badge?: string;
  priority: number;
  created_at: string;
  updated_at: string;
}

interface AnnouncementCardProps {
  announcement: Announcement;
  onClick?: () => void;
  showFullContent?: boolean;
  className?: string;
}

const AnnouncementCard = ({ 
  announcement, 
  onClick, 
  showFullContent = false,
  className = "" 
}: AnnouncementCardProps) => {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getBadgeVariant = (badge?: string) => {
    switch (badge?.toLowerCase()) {
      case 'important':
        return 'destructive';
      case 'new':
        return 'default';
      case 'notice':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  const getBadgeColor = (badge?: string) => {
    switch (badge?.toLowerCase()) {
      case 'important':
        return 'bg-red-500 text-white';
      case 'new':
        return 'bg-blue-500 text-white';
      case 'notice':
        return 'bg-amber-500 text-white';
      default:
        return 'bg-slate-500 text-white';
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5 }}
      className={className}
    >
      <Card 
        className={`group cursor-pointer border-0 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 bg-white overflow-hidden ${
          onClick ? 'hover:border-blue-200' : ''
        }`}
        onClick={onClick}
      >
        {/* Image Section */}
        {announcement.image_url && !imageError && (
          <div className="relative h-48 overflow-hidden bg-slate-100">
            <img
              src={announcement.image_url}
              alt={announcement.title}
              className={`w-full h-full object-cover transition-all duration-300 group-hover:scale-105 ${
                imageLoaded ? 'opacity-100' : 'opacity-0'
              }`}
              onLoad={() => setImageLoaded(true)}
              onError={() => setImageError(true)}
              loading="lazy"
            />
            {!imageLoaded && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="animate-spin h-6 w-6 border-2 border-blue-500 border-t-transparent rounded-full" />
              </div>
            )}
            
            {/* Badge Overlay */}
            {announcement.badge && (
              <div className="absolute top-4 left-4">
                <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getBadgeColor(announcement.badge)}`}>
                  {announcement.badge}
                </span>
              </div>
            )}
          </div>
        )}

        <CardContent className="p-6">
          {/* Badge for cards without images */}
          {!announcement.image_url && announcement.badge && (
            <div className="mb-3">
              <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getBadgeColor(announcement.badge)}`}>
                {announcement.badge}
              </span>
            </div>
          )}

          {/* Date */}
          <div className="flex items-center gap-2 text-sm text-slate-500 mb-3">
            <Calendar className="h-4 w-4" />
            <span>{formatDate(announcement.created_at)}</span>
          </div>

          {/* Title */}
          <h3 className="text-xl font-bold text-slate-900 mb-3 group-hover:text-blue-600 transition-colors line-clamp-2">
            {announcement.title}
          </h3>

          {/* Description */}
          <p className="text-slate-600 leading-relaxed mb-4" style={{
            display: '-webkit-box',
            WebkitLineClamp: 3,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden'
          }}>
            {announcement.description}
          </p>

          {/* Full Content (for detailed view) */}
          {showFullContent && announcement.content && (
            <div className="prose prose-sm max-w-none text-slate-700 mb-4">
              {announcement.content.split('\n').map((paragraph, index) => (
                <p key={index} className="mb-2">
                  {paragraph}
                </p>
              ))}
            </div>
          )}

          {/* Read More Link */}
          {onClick && !showFullContent && (
            <div className="flex items-center text-blue-600 font-medium text-sm group-hover:text-blue-700 transition-colors">
              <span>Read more</span>
              <ArrowRight className="h-4 w-4 ml-1 group-hover:translate-x-1 transition-transform" />
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default AnnouncementCard;