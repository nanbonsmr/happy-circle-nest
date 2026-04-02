import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Calendar, Loader2, Share2, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import logo from "@/assets/logo.png";

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

const AnnouncementDetail = () => {
  const { id } = useParams<{ id: string }>();
  const [announcement, setAnnouncement] = useState<Announcement | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [imageLoaded, setImageLoaded] = useState(false);

  useEffect(() => {
    if (id) {
      fetchAnnouncement();
    }
  }, [id]);

  const fetchAnnouncement = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('announcements')
        .select('*')
        .eq('id', id)
        .eq('is_published', true)
        .single();

      if (error) throw error;
      setAnnouncement(data);
    } catch (err: any) {
      console.error('Error fetching announcement:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
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

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: announcement?.title,
          text: announcement?.description,
          url: window.location.href,
        });
      } catch (err) {
        console.log('Error sharing:', err);
      }
    } else {
      // Fallback: copy to clipboard
      navigator.clipboard.writeText(window.location.href);
      // You could show a toast here
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/30 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (error || !announcement) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/30 flex items-center justify-center">
        <Card className="max-w-md mx-4">
          <CardContent className="p-8 text-center">
            <h2 className="text-xl font-bold text-slate-900 mb-2">Announcement Not Found</h2>
            <p className="text-slate-600 mb-4">The announcement you're looking for doesn't exist or has been removed.</p>
            <Button asChild>
              <Link to="/announcements">Back to Announcements</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/30">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-xl border-b border-white/20 shadow-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <Link to="/" className="flex items-center gap-3">
              <img src={logo} alt="NejoExamPrep" className="h-10 w-10 rounded-xl object-cover ring-2 ring-blue-100 shadow-sm" />
              <div>
                <span className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  NejoExamPrep
                </span>
                <div className="text-xs text-slate-500 -mt-1">Announcement</div>
              </div>
            </Link>
            
            <div className="flex items-center gap-2">
              <Button onClick={handleShare} variant="ghost" size="sm" className="text-slate-600 hover:text-blue-600">
                <Share2 className="h-4 w-4" />
              </Button>
              <Button asChild variant="ghost" className="text-slate-600 hover:text-blue-600">
                <Link to="/announcements" className="flex items-center gap-2">
                  <ArrowLeft className="h-4 w-4" />
                  Back
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="max-w-4xl mx-auto">
          <motion.article
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <Card className="border-0 shadow-xl overflow-hidden">
              {/* Hero Image */}
              {announcement.image_url && (
                <div className="relative h-64 md:h-80 overflow-hidden bg-slate-100">
                  <img
                    src={announcement.image_url}
                    alt={announcement.title}
                    className={`w-full h-full object-cover transition-opacity duration-300 ${
                      imageLoaded ? 'opacity-100' : 'opacity-0'
                    }`}
                    onLoad={() => setImageLoaded(true)}
                  />
                  {!imageLoaded && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="animate-spin h-8 w-8 border-2 border-blue-500 border-t-transparent rounded-full" />
                    </div>
                  )}
                  
                  {/* Badge Overlay */}
                  {announcement.badge && (
                    <div className="absolute top-6 left-6">
                      <span className={`px-4 py-2 rounded-full text-sm font-semibold ${getBadgeColor(announcement.badge)}`}>
                        {announcement.badge}
                      </span>
                    </div>
                  )}
                </div>
              )}

              <CardContent className="p-8 md:p-12">
                {/* Badge for announcements without images */}
                {!announcement.image_url && announcement.badge && (
                  <div className="mb-6">
                    <span className={`px-4 py-2 rounded-full text-sm font-semibold ${getBadgeColor(announcement.badge)}`}>
                      {announcement.badge}
                    </span>
                  </div>
                )}

                {/* Meta Information */}
                <div className="flex flex-wrap items-center gap-4 text-sm text-slate-500 mb-6">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    <span>Published {formatDate(announcement.created_at)}</span>
                  </div>
                  {announcement.updated_at !== announcement.created_at && (
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      <span>Updated {formatDate(announcement.updated_at)}</span>
                    </div>
                  )}
                </div>

                {/* Title */}
                <h1 className="text-3xl md:text-4xl font-bold text-slate-900 mb-6 leading-tight">
                  {announcement.title}
                </h1>

                {/* Description */}
                <div className="text-xl text-slate-600 leading-relaxed mb-8">
                  {announcement.description}
                </div>

                {/* Content */}
                {announcement.content && (
                  <div className="prose prose-lg max-w-none text-slate-700">
                    {announcement.content.split('\n').map((paragraph, index) => (
                      <p key={index} className="mb-4 leading-relaxed">
                        {paragraph}
                      </p>
                    ))}
                  </div>
                )}

                {/* Footer Actions */}
                <div className="mt-12 pt-8 border-t border-slate-200 flex flex-col sm:flex-row gap-4 justify-between items-center">
                  <div className="text-sm text-slate-500">
                    Last updated: {formatDate(announcement.updated_at)}
                  </div>
                  
                  <div className="flex gap-3">
                    <Button onClick={handleShare} variant="outline" size="sm">
                      <Share2 className="h-4 w-4 mr-2" />
                      Share
                    </Button>
                    <Button asChild>
                      <Link to="/announcements">
                        View All Announcements
                      </Link>
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.article>
        </div>
      </main>
    </div>
  );
};

export default AnnouncementDetail;