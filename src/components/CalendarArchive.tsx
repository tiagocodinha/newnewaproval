import React, { useState } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isToday, parseISO } from 'date-fns';
import { ChevronLeft, ChevronRight, ExternalLink, Play } from 'lucide-react';

type ContentItem = {
  id: string;
  caption: string;
  content_type: string;
  media_url: string;
  schedule_date: string;
  status: string;
};

type CalendarArchiveProps = {
  items: ContentItem[];
};

export default function CalendarArchive({ items }: CalendarArchiveProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedContent, setSelectedContent] = useState<ContentItem | null>(null);

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const previousMonth = () => {
    setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() - 1));
  };

  const nextMonth = () => {
    setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() + 1));
  };

  const getDayContent = (date: Date) => {
    return items.filter(item => {
      const itemDate = parseISO(item.schedule_date);
      return format(itemDate, 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd');
    });
  };

  const getMediaPreviewUrl = (url: string) => {
    if (!url) return '';

    // Handle Google Drive URLs
    if (url.includes('drive.google.com')) {
      // Extract file ID from various Google Drive URL formats
      let fileId = '';
      
      if (url.includes('/file/d/')) {
        // Format: https://drive.google.com/file/d/FILE_ID/view
        fileId = url.split('/file/d/')[1].split('/')[0];
      }

      if (fileId) {
        // Return the direct preview URL
        return `https://drive.google.com/uc?export=view&id=${fileId}`;
      }
    }

    return url;
  };

  const isVideo = (url: string) => {
    if (!url) return false;
    const videoExtensions = ['.mp4', '.mov', '.avi', '.wmv', '.flv', '.mkv'];
    const isGoogleDriveVideo = url.includes('drive.google.com') && url.toLowerCase().includes('video');
    return videoExtensions.some(ext => url.toLowerCase().includes(ext)) || isGoogleDriveVideo;
  };

  const renderMediaPreview = (content: ContentItem) => {
    const previewUrl = getMediaPreviewUrl(content.media_url);
    const isVideoContent = isVideo(content.media_url);

    return (
      <div 
        className="relative group bg-gray-100 rounded-lg overflow-hidden cursor-pointer h-24"
        onClick={() => setSelectedContent(content)}
      >
        {isVideoContent ? (
          <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-10">
            <Play className="w-8 h-8 text-white drop-shadow-lg" />
          </div>
        ) : (
          <img
            src={previewUrl}
            alt={content.caption}
            className="w-full h-full object-cover"
            onError={(e) => {
              e.currentTarget.src = 'https://placehold.co/600x400?text=Preview+Not+Available';
            }}
          />
        )}
        <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-opacity flex items-center justify-center opacity-0 group-hover:opacity-100">
          <a
            href={content.media_url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-white flex items-center gap-1 bg-black bg-opacity-75 px-2 py-1 rounded-full text-xs"
            onClick={(e) => e.stopPropagation()}
          >
            <ExternalLink className="w-3 h-3" />
            View
          </a>
        </div>
      </div>
    );
  };

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-2xl font-bold">
          {format(currentDate, 'MMMM yyyy')}
        </h2>
        <div className="flex gap-2">
          <button
            onClick={previousMonth}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            onClick={nextMonth}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-px bg-gray-200 rounded-lg overflow-hidden">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
          <div
            key={day}
            className="bg-gray-50 p-2 text-center text-sm font-semibold"
          >
            {day}
          </div>
        ))}

        {daysInMonth.map((day, dayIdx) => {
          const dayContent = getDayContent(day);
          const isCurrentMonth = isSameMonth(day, currentDate);
          const isCurrentDay = isToday(day);

          return (
            <div
              key={day.toString()}
              className={`min-h-[10rem] max-h-[16rem] p-1 overflow-y-auto ${
                isCurrentMonth ? 'bg-white' : 'bg-gray-50'
              } ${isCurrentDay ? 'ring-2 ring-black ring-inset' : ''}`}
            >
              <div className="flex justify-between items-start">
                <span
                  className={`text-sm font-medium ${
                    isCurrentMonth ? 'text-gray-900' : 'text-gray-400'
                  }`}
                >
                  {format(day, 'd')}
                </span>
                {dayContent.length > 0 && (
                  <span className="text-xs font-medium bg-gray-100 px-1.5 py-0.5 rounded-full">
                    {dayContent.length}
                  </span>
                )}
              </div>
              {dayContent.length > 0 && (
                <div className="mt-1 space-y-1">
                  {dayContent.map(content => (
                    <div key={content.id} className="space-y-1">
                      {renderMediaPreview(content)}
                      <div className="px-0.5">
                        <div className="flex items-center gap-1 flex-wrap">
                          <span className={`px-1.5 py-0.5 text-xs font-medium rounded-full ${
                            content.status === 'Approved' ? 'bg-green-100 text-green-800' :
                            content.status === 'Rejected' ? 'bg-red-100 text-red-800' :
                            'bg-yellow-100 text-yellow-800'
                          }`}>
                            {content.content_type}
                          </span>
                          <span className={`text-xs font-medium ${
                            content.status === 'Approved' ? 'text-green-600' :
                            content.status === 'Rejected' ? 'text-red-600' :
                            'text-yellow-600'
                          }`}>
                            {content.status}
                          </span>
                        </div>
                        <p className="text-xs text-gray-600 mt-0.5 line-clamp-2 whitespace-pre-wrap">
                          {content.caption}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Modal for selected content */}
      {selectedContent && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-50"
          onClick={() => setSelectedContent(null)}
        >
          <div 
            className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto"
            onClick={e => e.stopPropagation()}
          >
            <div className="p-4 border-b">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Content Details</h3>
                <button 
                  onClick={() => setSelectedContent(null)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            <div className="p-4">
              <div className="aspect-video bg-black flex items-center justify-center mb-4">
                {isVideo(selectedContent.media_url) ? (
                  <div className="w-full h-full flex items-center justify-center bg-gray-900">
                    <a 
                      href={selectedContent.media_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-white hover:text-gray-200"
                    >
                      <Play className="w-12 h-12" />
                      <span>Open video</span>
                    </a>
                  </div>
                ) : (
                  <img
                    src={getMediaPreviewUrl(selectedContent.media_url)}
                    alt={selectedContent.caption}
                    className="max-h-full object-contain"
                    onError={(e) => {
                      e.currentTarget.src = 'https://placehold.co/600x400?text=Preview+Not+Available';
                    }}
                  />
                )}
              </div>
              <div className="space-y-4">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`px-2 py-1 text-sm font-medium rounded-full ${
                      selectedContent.status === 'Approved' ? 'bg-green-100 text-green-800' :
                      selectedContent.status === 'Rejected' ? 'bg-red-100 text-red-800' :
                      'bg-yellow-100 text-yellow-800'
                    }`}>
                      {selectedContent.content_type}
                    </span>
                    <span className={`text-sm font-medium ${
                      selectedContent.status === 'Approved' ? 'text-green-600' :
                      selectedContent.status === 'Rejected' ? 'text-red-600' :
                      'text-yellow-600'
                    }`}>
                      {selectedContent.status}
                    </span>
                  </div>
                  <p className="text-gray-700 whitespace-pre-wrap">
                    {selectedContent.caption}
                  </p>
                </div>
                <div>
                  <a
                    href={selectedContent.media_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"
                  >
                    <ExternalLink className="w-4 h-4" />
                    Open original
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}