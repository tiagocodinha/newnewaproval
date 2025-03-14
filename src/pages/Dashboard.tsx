import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format, isBefore, startOfDay, parseISO } from 'date-fns';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { Calendar, List, Grid2X2, CheckCircle2, XCircle, ExternalLink, Loader2, Plus, X, CalendarIcon, Archive } from 'lucide-react';
import Header from '../components/Header';

type ViewMode = 'list' | 'type' | 'calendar' | 'archive';
type ContentItem = {
  id: string;
  caption: string;
  content_type: 'Post' | 'Story' | 'Reel' | 'TikTok';
  media_url: string;
  status: 'Approved' | 'Rejected' | 'Pending';
  schedule_date: string;
  rejection_notes?: string;
  rejected_at?: string;
  assigned_to_profile?: {
    email: string;
    full_name: string;
  };
};

export default function Dashboard() {
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedClient, setSelectedClient] = useState<string>('all');
  const [showForm, setShowForm] = useState(false);
  const [rejectionNotes, setRejectionNotes] = useState<string>('');
  const [rejectingItemId, setRejectingItemId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    caption: '',
    content_type: 'Post',
    media_url: '',
    schedule_date: format(new Date(), 'yyyy-MM-dd'),
    assigned_to: '',
  });

  const { profile } = useAuth();
  const isAdmin = profile?.email === 'geral@stagelink.pt';
  const today = startOfDay(new Date());

  const { data: profiles = [] } = useQuery({
    queryKey: ['profiles'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('is_admin', false);

      if (error) throw error;
      return data;
    },
    enabled: isAdmin,
  });

  const { data: contentItems = [], isLoading: isLoadingContent, refetch } = useQuery({
    queryKey: ['content-items', profile?.id, isAdmin],
    queryFn: async () => {
      if (!profile?.id) return [];
      
      const query = supabase
        .from('content_items')
        .select(`
          *,
          assigned_to_profile:profiles!content_items_assigned_to_fkey(email, full_name)
        `)
        .order('schedule_date', { ascending: true });

      if (!isAdmin) {
        query.eq('assigned_to', profile.id);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as ContentItem[];
    },
    enabled: !!profile?.id,
  });

  const { currentContent, archivedContent } = contentItems.reduce((acc, item) => {
    const itemDate = startOfDay(parseISO(item.schedule_date));
    if (isBefore(itemDate, today)) {
      acc.archivedContent.push(item);
    } else {
      acc.currentContent.push(item);
    }
    return acc;
  }, { currentContent: [] as ContentItem[], archivedContent: [] as ContentItem[] });

  const filteredItems = contentItems.filter(item => {
    if (viewMode === 'archive') return isBefore(startOfDay(parseISO(item.schedule_date)), today);
    
    const isCurrentContent = !isBefore(startOfDay(parseISO(item.schedule_date)), today);
    const matchesType = selectedType === 'all' || item.content_type === selectedType;
    const matchesStatus = selectedStatus === 'all' || item.status === selectedStatus;
    const matchesClient = selectedClient === 'all' || item.assigned_to_profile?.email === selectedClient;
    return isCurrentContent && matchesType && matchesStatus && matchesClient;
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.assigned_to) {
      alert('Please select a user to assign the content to');
      return;
    }

    const { error } = await supabase.from('content_items').insert({
      ...formData,
      created_by: profile?.id,
      status: 'Pending'
    });

    if (!error) {
      setShowForm(false);
      setFormData({
        caption: '',
        content_type: 'Post',
        media_url: '',
        schedule_date: format(new Date(), 'yyyy-MM-dd'),
        assigned_to: '',
      });
      refetch();
    }
  };

  const handleStatusUpdate = async (id: string, status: 'Approved' | 'Rejected') => {
    if (status === 'Rejected') {
      setRejectingItemId(id);
      setRejectionNotes('');
      return;
    }

    const { error } = await supabase
      .from('content_items')
      .update({ status })
      .eq('id', id);

    if (!error) {
      refetch();
    }
  };

  const handleReject = async () => {
    if (!rejectingItemId || !rejectionNotes.trim()) return;

    const { error } = await supabase
      .from('content_items')
      .update({
        status: 'Rejected',
        rejection_notes: rejectionNotes,
        rejected_at: new Date().toISOString()
      })
      .eq('id', rejectingItemId);

    if (!error) {
      setRejectingItemId(null);
      setRejectionNotes('');
      refetch();
    }
  };

  const renderContentItem = (item: ContentItem) => (
    <div key={item.id} className="bg-white p-4 sm:p-6 rounded-lg shadow-md space-y-4 w-full">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div className="space-y-2">
          <span className="inline-block px-3 py-1 bg-black text-white rounded-full text-sm">
            {item.content_type}
          </span>
          {isAdmin && item.assigned_to_profile && (
            <div className="text-sm text-gray-500">
              Assigned to: {item.assigned_to_profile.full_name || item.assigned_to_profile.email}
            </div>
          )}
        </div>
        {viewMode !== 'archive' && item.status === 'Pending' && (
          <div className="flex sm:space-x-2">
            <button
              onClick={() => handleStatusUpdate(item.id, 'Approved')}
              className="p-2 hover:bg-green-50 rounded-full transition-colors"
            >
              <CheckCircle2 className="w-6 h-6 text-gray-400 hover:text-green-500" />
            </button>
            <button
              onClick={() => handleStatusUpdate(item.id, 'Rejected')}
              className="p-2 hover:bg-red-50 rounded-full transition-colors"
            >
              <XCircle className="w-6 h-6 text-gray-400 hover:text-red-500" />
            </button>
          </div>
        )}
      </div>
      <p className="text-gray-700 break-words">{item.caption}</p>
      <div className="flex flex-wrap items-center gap-2 text-sm text-gray-500">
        <a
          href={item.media_url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center hover:text-black"
        >
          <ExternalLink className="w-4 h-4 mr-1" />
          View Content
        </a>
        <span className="hidden sm:inline">•</span>
        <span>{format(new Date(item.schedule_date), 'MMM d, yyyy')}</span>
      </div>
      <div className="flex flex-col space-y-2">
        <div className={`text-sm font-medium ${
          item.status === 'Approved' ? 'text-green-500' :
          item.status === 'Rejected' ? 'text-red-500' :
          'text-yellow-500'
        }`}>
          {item.status}
        </div>
        {item.status === 'Rejected' && item.rejection_notes && (
          <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded-md">
            <strong>Rejection Notes:</strong> {item.rejection_notes}
          </div>
        )}
      </div>
    </div>
  );

  const renderList = () => {
    if (isLoadingContent) {
      return (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
        </div>
      );
    }

    if (filteredItems.length === 0) {
      return (
        <div className="text-center py-12">
          <p className="text-gray-500">No content items found</p>
        </div>
      );
    }

    return (
      <div className="p-4 space-y-8">
        <div className="grid grid-cols-1 gap-6">
          {filteredItems.map(renderContentItem)}
        </div>
      </div>
    );
  };

  const renderByType = () => {
    if (isLoadingContent) {
      return (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
        </div>
      );
    }
  
    const types = ['Post', 'Story', 'Reel', 'TikTok'];
    
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 p-4">
        {types.map(type => (
          <div key={type} className="min-w-0 flex flex-col">
            <h3 className="text-xl font-semibold mb-4">{type}s</h3>
            <div className="space-y-4 flex-1">
              {filteredItems
                .filter(item => item.content_type === type)
                .map(item => (
                  <div key={item.id} className="bg-white p-4 rounded-lg shadow-md space-y-3 break-words">
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                      <div className="space-y-2 min-w-0">
                        <span className="inline-block px-3 py-1 bg-black text-white rounded-full text-sm">
                          {item.content_type}
                        </span>
                        {isAdmin && item.assigned_to_profile && (
                          <div className="text-sm text-gray-500 truncate">
                            Assigned to: {item.assigned_to_profile.full_name || item.assigned_to_profile.email}
                          </div>
                        )}
                      </div>
                      {viewMode !== 'archive' && item.status === 'Pending' && (
                        <div className="flex shrink-0 gap-1">
                          <button
                            onClick={() => handleStatusUpdate(item.id, 'Approved')}
                            className="p-1.5 hover:bg-green-50 rounded-full transition-colors"
                          >
                            <CheckCircle2 className="w-5 h-5 text-gray-400 hover:text-green-500" />
                          </button>
                          <button
                            onClick={() => handleStatusUpdate(item.id, 'Rejected')}
                            className="p-1.5 hover:bg-red-50 rounded-full transition-colors"
                          >
                            <XCircle className="w-5 h-5 text-gray-400 hover:text-red-500" />
                          </button>
                        </div>
                      )}
                    </div>
                    <p className="text-gray-700 text-sm line-clamp-3">{item.caption}</p>
                    <div className="flex flex-wrap items-center gap-2 text-sm text-gray-500">
                      <a
                        href={item.media_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center hover:text-black"
                      >
                        <ExternalLink className="w-4 h-4 mr-1" />
                        View Content
                      </a>
                      <span className="hidden sm:inline">•</span>
                      <span>{format(new Date(item.schedule_date), 'MMM d, yyyy')}</span>
                    </div>
                    <div className="flex flex-col space-y-2">
                      <div className={`text-sm font-medium ${
                        item.status === 'Approved' ? 'text-green-500' :
                        item.status === 'Rejected' ? 'text-red-500' :
                        'text-yellow-500'
                      }`}>
                        {item.status}
                      </div>
                      {item.status === 'Rejected' && item.rejection_notes && (
                        <div className="text-sm text-gray-600 bg-gray-50 p-2 rounded-md">
                          <strong>Rejection Notes:</strong> {item.rejection_notes}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              {filteredItems.filter(item => item.content_type === type).length === 0 && (
                <div className="text-center py-4 text-gray-500 text-sm">
                  No {type.toLowerCase()}s found
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderCalendar = () => {
    if (isLoadingContent) {
      return (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
        </div>
      );
    }

    const itemsByDate = filteredItems.reduce((acc, item) => {
      const date = format(new Date(item.schedule_date), 'yyyy-MM-dd');
      if (!acc[date]) acc[date] = [];
      acc[date].push(item);
      return acc;
    }, {} as Record<string, ContentItem[]>);

    if (Object.keys(itemsByDate).length === 0) {
      return (
        <div className="text-center py-12">
          <p className="text-gray-500">No content scheduled</p>
        </div>
      );
    }

    return (
      <div className="space-y-6 p-4">
        {Object.entries(itemsByDate).map(([date, items]) => (
          <div key={date} className="space-y-4">
            <h3 className="text-xl font-semibold">
              {format(new Date(date), 'MMMM d, yyyy')}
            </h3>
            <div className="grid gap-4">
              {items.map(renderContentItem)}
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderArchive = () => {
    if (isLoadingContent) {
      return (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
        </div>
      );
    }

    const itemsByYearAndMonth = archivedContent.reduce((acc, item) => {
      const year = format(new Date(item.schedule_date), 'yyyy');
      const month = format(new Date(item.schedule_date), 'MMMM');
      
      if (!acc[year]) acc[year] = {};
      if (!acc[year][month]) acc[year][month] = [];
      
      acc[year][month].push(item);
      return acc;
    }, {} as Record<string, Record<string, ContentItem[]>>);

    if (Object.keys(itemsByYearAndMonth).length === 0) {
      return (
        <div className="text-center py-12">
          <p className="text-gray-500">No archived content</p>
        </div>
      );
    }

    return (
      <div className="space-y-12 p-4">
        {Object.entries(itemsByYearAndMonth)
          .sort(([yearA], [yearB]) => Number(yearB) - Number(yearA))
          .map(([year, months]) => (
            <div key={year} className="space-y-8">
              <h2 className="text-2xl font-bold border-b pb-2">{year}</h2>
              {Object.entries(months).map(([month, items]) => (
                <div key={`${year}-${month}`} className="space-y-4">
                  <h3 className="text-xl font-semibold">{month}</h3>
                  <div className="grid gap-4">
                    {items.map(renderContentItem)}
                  </div>
                </div>
              ))}
            </div>
          ))}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-6 sm:py-8">
        <Header isAdmin={isAdmin} />

        <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="w-full sm:w-auto overflow-x-auto pb-2 sm:pb-0">
            <div className="flex bg-white rounded-lg shadow-sm min-w-max">
              <button
                onClick={() => setViewMode('list')}
                className={`flex items-center px-3 sm:px-4 py-2 rounded-l-lg ${
                  viewMode === 'list' ? 'bg-black text-white' : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <List className="w-5 h-5 mr-1 sm:mr-2" />
                <span className="text-sm sm:text-base">List</span>
              </button>
              <button
                onClick={() => setViewMode('type')}
                className={`flex items-center px-3 sm:px-4 py-2 ${
                  viewMode === 'type' ? 'bg-black text-white' : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <Grid2X2 className="w-5 h-5 mr-1 sm:mr-2" />
                <span className="text-sm sm:text-base">By Type</span>
              </button>
              <button
                onClick={() => setViewMode('calendar')}
                className={`flex items-center px-3 sm:px-4 py-2 ${
                  viewMode === 'calendar' ? 'bg-black text-white' : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <Calendar className="w-5 h-5 mr-1 sm:mr-2" />
                <span className="text-sm sm:text-base">Calendar</span>
              </button>
              <button
                onClick={() => setViewMode('archive')}
                className={`flex items-center px-3 sm:px-4 py-2 rounded-r-lg ${
                  viewMode === 'archive' ? 'bg-black text-white' : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <Archive className="w-5 h-5 mr-1 sm:mr-2" />
                <span className="text-sm sm:text-base">Archive</span>
              </button>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
            {viewMode !== 'archive' && viewMode === 'list' && (
              <>
                <div className="flex flex-col sm:flex-row gap-4">
                  <select
                    value={selectedType}
                    onChange={(e) => setSelectedType(e.target.value)}
                    className="px-3 sm:px-4 py-2 bg-white border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-black text-sm sm:text-base"
                  >
                    <option value="all">All Types</option>
                    <option value="Post">Posts</option>
                    <option value="Story">Stories</option>
                    <option value="Reel">Reels</option>
                    <option value="TikTok">TikTok</option>
                  </select>

                  {isAdmin && (
                    <>
                      <select
                        value={selectedStatus}
                        onChange={(e) => setSelectedStatus(e.target.value)}
                        className="px-3 sm:px-4 py-2 bg-white border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-black text-sm sm:text-base"
                      >
                        <option value="all">All Status</option>
                        <option value="Approved">Approved</option>
                        <option value="Rejected">Rejected</option>
                        <option value="Pending">Pending</option>
                      </select>

                      <select
                        value={selectedClient}
                        onChange={(e) => setSelectedClient(e.target.value)}
                        className="px-3 sm:px-4 py-2 bg-white border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-black text-sm sm:text-base"
                      >
                        <option value="all">All Clients</option>
                        {profiles.map((profile) => (
                          <option key={profile.id} value={profile.email}>
                            {profile.full_name || profile.email}
                          </option>
                        ))}
                      </select>
                    </>
                  )}
                </div>
              </>
            )}

            {viewMode !== 'archive' && isAdmin && (
              <button
                onClick={() => setShowForm(true)}
                className="flex items-center justify-center px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-900 text-sm sm:text-base whitespace-nowrap"
              >
                <Plus className="w-5 h-5 mr-2" />
                Add Content
              </button>
            )}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          {viewMode === 'list' && renderList()}
          {viewMode === 'type' && renderByType()}
          {viewMode === 'calendar' && renderCalendar()}
          {viewMode === 'archive' && renderArchive()}
        </div>

        {showForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold">Add New Content</h2>
                <button
                  onClick={() => setShowForm(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Assign To
                  </label>
                  <select
                    value={formData.assigned_to}
                    onChange={(e) => setFormData({ ...formData, assigned_to: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
                    required
                  >
                    <option value="">Select a user</option>
                    {profiles.map((profile) => (
                      <option key={profile.id} value={profile.id}>
                        {profile.full_name || profile.email}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Caption
                  </label>
                  <textarea
                    value={formData.caption}
                    onChange={(e) => setFormData({ ...formData, caption: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
                    required
                    rows={4}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Content Type
                    </label>
                    <select
                      value={formData.content_type}
                      onChange={(e) => setFormData({ ...formData, content_type: e.target.value as any })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
                    >
                      <option value="Post">Post</option>
                      <option value="Story">Story</option>
                      <option value="Reel">Reel</option>
                      <option value="TikTok">TikTok</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Schedule Date
                    </label>
                    <div className="relative">
                      <input
                        type="date"
                        value={formData.schedule_date}
                        onChange={(e) => setFormData({ ...formData, schedule_date: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
                        style={{
                          colorScheme: 'light',
                          '::-webkit-calendar-picker-indicator': {
                            cursor: 'pointer',
                            filter: 'invert(0.5)',
                          },
                        }}
                        required
                      />
                      <CalendarIcon className="absolute right-3 top-2.5 w-5 h-5 text-gray-400 pointer-events-none" />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Media URL (Google Drive)
                  </label>
                  <input
                    type="url"
                    value={formData.media_url}
                    onChange={(e) => setFormData({ ...formData, media_url: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
                    required
                  />
                </div>

                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => setShowForm(false)}
                    className="px-4 py-2 text-gray-700 hover:text-gray-900"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-900"
                  >
                    Create Content
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {rejectingItemId && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold">Rejection Notes</h2>
                <button
                  onClick={() => setRejectingItemId(null)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Please provide a reason for rejection
                    <span className="text-red-500 ml-1">*</span>
                  </label>
                  <textarea
                    value={rejectionNotes}
                    onChange={(e) => setRejectionNotes(e.target.value)}
                    className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-black transition-colors ${
                      rejectionNotes.trim() ? 'border-gray-300' : 'border-red-300'
                    }`}
                    placeholder="Enter your rejection reason here..."
                    rows={4}
                    required
                  />
                  {!rejectionNotes.trim() && (
                    <p className="mt-1 text-sm text-red-500">
                      Rejection notes are required
                    </p>
                  )}
                </div>

                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => setRejectingItemId(null)}
                    className="px-4 py-2 text-gray-700 hover:text-gray-900"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleReject}
                    disabled={!rejectionNotes.trim()}
                    className={`px-4 py-2 rounded-lg text-white transition-all ${
                      rejectionNotes.trim()
                        ? 'bg-red-600 hover:bg-red-700 cursor-pointer'
                        : 'bg-red-300 cursor-not-allowed'
                    }`}
                  >
                    Reject Content
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}