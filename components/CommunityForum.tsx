import React, { useState, useMemo, useRef, useEffect } from 'react';
import type { ForumPost, ForumReply, User } from '../types';
import Card from './common/Card';
import Button from './common/Button';
import { 
  ArrowLeftIcon, 
  PlusIcon, 
  PaperClipIcon, 
  TrashIcon, 
  XIcon, 
  UploadIcon, 
  UsersIcon, 
  MessageSquareIcon,
  UserCircleIcon,
  CheckCircleIcon
} from './common/icons';
import { fileToDataUri } from '../utils';
import { uploadUserFile } from '../services/storageService';
import { supabase } from '../services/supabase';

interface CommunityForumProps {
  user: User | null;
}

const CommunityForum: React.FC<CommunityForumProps> = ({ user }) => {
  const [posts, setPosts] = useState<ForumPost[]>([]);
  const [view, setView] = useState<'LIST' | 'POST' | 'CREATE'>('LIST');
  const [selectedPostId, setSelectedPostId] = useState<number | null>(null);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form states
  const [newPostTitle, setNewPostTitle] = useState('');
  const [newPostContent, setNewPostContent] = useState('');
  const [newPostFiles, setNewPostFiles] = useState<File[]>([]);
  const [newPostPreviews, setNewPostPreviews] = useState<string[]>([]);
  
  const [newReplyContent, setNewReplyContent] = useState('');
  const [newReplyFiles, setNewReplyFiles] = useState<File[]>([]);
  const [newReplyPreviews, setNewReplyPreviews] = useState<string[]>([]);
  
  const postFileInputRef = useRef<HTMLInputElement>(null);
  const replyFileInputRef = useRef<HTMLInputElement>(null);

  // Fetch posts from Supabase
  const fetchPosts = async () => {
    try {
      const { data, error } = await supabase
        .from('forum_posts')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (data) {
        const mappedPosts: ForumPost[] = data.map((p: any) => ({
          ...p,
          replies: Array.isArray(p.replies) ? p.replies : []
        }));
        setPosts(mappedPosts);
      }
    } catch (err) {
      console.warn("Could not load posts from Supabase:", err);
    }
  };

  useEffect(() => {
    fetchPosts();

    const sub = supabase.channel('forum').on(
      'postgres_changes', 
      { event: '*', schema: 'public', table: 'forum_posts' }, 
      fetchPosts
    ).subscribe();

    return () => { sub.unsubscribe(); };
  }, []);

  const selectedPost = useMemo(() => {
    if (view !== 'POST' || !selectedPostId) return null;
    return posts.find(p => p.id === selectedPostId);
  }, [view, selectedPostId, posts]);

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPostTitle.trim() || !newPostContent.trim()) {
      setError("Please provide both a title and description.");
      return;
    }
    
    setIsSubmitting(true);
    setError('');
    let uploadedUrls: string[] = [];

    try {
      if (user && user.uid && newPostFiles.length > 0) {
        const uploadPromises = newPostFiles.map((file, index) => 
          uploadUserFile(user.uid!, file, 'forum', '', `Post: ${newPostTitle} (${index + 1})`)
        );
        const results = await Promise.all(uploadPromises);
        uploadedUrls = results.map(f => f.download_url);
      }

      const newPostData = {
        author: user?.name || 'Guest Farmer', 
        created_at: new Date().toISOString(),
        title: newPostTitle.trim(),
        content: newPostContent.trim(),
        image_url: uploadedUrls.length > 0 ? uploadedUrls[0] : null,
        images: uploadedUrls,
        replies: [],
      };
      
      const { data, error: insertError } = await supabase.from('forum_posts').insert([newPostData]).select();
      if (insertError) throw insertError;
      
      if (data && data.length > 0) {
        setPosts(prev => [data[0], ...prev]);
        setSelectedPostId(data[0].id);
        setView('POST');
      } else {
        await fetchPosts();
        setView('LIST');
      }

      setNewPostTitle(''); 
      setNewPostContent(''); 
      setNewPostFiles([]); 
      setNewPostPreviews([]);
    } catch (err: any) {
      console.error("Error creating post:", err);
      setError(err?.message || "Failed to create post. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const handleAddReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newReplyContent.trim() || !selectedPostId || !selectedPost) return;
    
    setIsSubmitting(true);
    setError('');
    let uploadedUrls: string[] = [];

    try {
      if (user && user.uid && newReplyFiles.length > 0) {
        const uploadPromises = newReplyFiles.map((file, index) => 
          uploadUserFile(user.uid!, file, 'forum', '', `Reply to Post #${selectedPostId}`)
        );
        const results = await Promise.all(uploadPromises);
        uploadedUrls = results.map(f => f.download_url);
      }

      const newReply: ForumReply = {
        id: Date.now(),
        author: user?.name || 'Guest Farmer',
        created_at: new Date().toISOString(),
        content: newReplyContent.trim(),
        image_url: uploadedUrls.length > 0 ? uploadedUrls[0] : undefined,
        images: uploadedUrls
      };

      const currentReplies = selectedPost.replies || [];
      const updatedReplies = [...currentReplies, newReply];
      
      const { error: updateError } = await supabase
        .from('forum_posts')
        .update({ replies: updatedReplies })
        .eq('id', selectedPostId);

      if (updateError) throw updateError;

      // Optimistically update selected post in state
      setPosts(prev => prev.map(p => p.id === selectedPostId ? { ...p, replies: updatedReplies } : p));
      setNewReplyContent(''); 
      setNewReplyFiles([]); 
      setNewReplyPreviews([]);
    } catch (err: any) {
      console.error("Error adding reply:", err);
      setError(err?.message || "Failed to add reply.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeletePost = async (postId: number) => {
    if (!window.confirm("Are you sure you want to delete this discussion post?")) return;
    try {
      await supabase.from('forum_posts').delete().eq('id', postId);
      setPosts(prev => prev.filter(p => p.id !== postId));
      if (selectedPostId === postId) {
        setView('LIST');
        setSelectedPostId(null);
      }
    } catch(e) { 
      console.error("Error deleting post:", e); 
    }
  };

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>, type: 'post' | 'reply') => {
    if (e.target.files && e.target.files.length > 0) {
      const files: File[] = Array.from(e.target.files);
      const previews = await Promise.all(files.map(f => fileToDataUri(f)));
      if (type === 'post') {
        setNewPostFiles(prev => [...prev, ...files]);
        setNewPostPreviews(prev => [...prev, ...previews]);
      } else {
        setNewReplyFiles(prev => [...prev, ...files]);
        setNewReplyPreviews(prev => [...prev, ...previews]);
      }
    }
  };

  const removePostFile = (index: number) => {
    setNewPostFiles(prev => prev.filter((_, i) => i !== index));
    setNewPostPreviews(prev => prev.filter((_, i) => i !== index));
  };

  const removeReplyFile = (index: number) => {
    setNewReplyFiles(prev => prev.filter((_, i) => i !== index));
    setNewReplyPreviews(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <Card className="text-gray-900">
      {/* 1. POST LIST VIEW */}
      {view === 'LIST' && (
        <div>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center pb-4 mb-6 border-b border-gray-200 gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-green-100 rounded-xl text-green-700">
                <UsersIcon className="w-6 h-6 text-green-700" />
              </div>
              <div>
                <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Community Farmer Discussions</h2>
                <p className="text-xs sm:text-sm text-gray-600">
                  Ask questions, share organic remedies, and connect with fellow Ghanaian farmers.
                </p>
              </div>
            </div>

            <Button 
              onClick={() => { setError(''); setView('CREATE'); }} 
              className="inline-flex items-center gap-1.5 shadow-sm"
            >
              <PlusIcon className="w-4 h-4" />
              <span>New Post</span>
            </Button>
          </div>

          {posts.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-xl border border-dashed border-gray-300">
              <MessageSquareIcon className="w-10 h-10 text-gray-400 mx-auto mb-2" />
              <h3 className="text-base font-bold text-gray-800">No discussions posted yet</h3>
              <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto">
                Be the first to start a conversation, report a crop symptom, or ask for farming advice.
              </p>
              <Button 
                onClick={() => setView('CREATE')} 
                className="mt-4 inline-flex items-center gap-1 text-xs"
              >
                <PlusIcon className="w-4 h-4" /> Create First Post
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {posts.map(post => {
                const isAuthorOrAdmin = user && (user.type === 'admin' || user.name === post.author);
                return (
                  <div key={post.id} className="relative group">
                    <div 
                      onClick={() => { setSelectedPostId(post.id); setView('POST'); }} 
                      className="bg-white border-2 border-gray-200 hover:border-green-600 rounded-xl p-4 sm:p-5 shadow-xs hover:shadow-md transition-all cursor-pointer"
                    >
                      <div className="flex justify-between items-start gap-2">
                        <div className="flex-grow">
                          <h3 className="text-lg font-bold text-gray-900 group-hover:text-green-800 transition-colors leading-snug">
                            {post.title}
                          </h3>
                          <p className="text-sm text-gray-700 mt-1.5 line-clamp-2 leading-relaxed">
                            {post.content}
                          </p>
                        </div>

                        {/* Thumbnail preview if post has images */}
                        {(post.image_url || (post.images && post.images.length > 0)) && (
                          <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-lg overflow-hidden border border-gray-200 flex-shrink-0 ml-3">
                            <img 
                              src={post.image_url || post.images?.[0]} 
                              alt="Post thumbnail" 
                              className="w-full h-full object-cover"
                            />
                          </div>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center justify-between gap-2 mt-4 pt-3 border-t border-gray-100 text-xs text-gray-500">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-green-900 bg-green-50 px-2 py-0.5 rounded border border-green-200">
                            {post.author}
                          </span>
                          <span>•</span>
                          <span>{new Date(post.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                        </div>

                        <div className="flex items-center gap-3">
                          <span className="inline-flex items-center gap-1 font-semibold text-gray-700 bg-gray-100 px-2.5 py-0.5 rounded-full">
                            <MessageSquareIcon className="w-3.5 h-3.5 text-gray-600" />
                            <span>{post.replies?.length || 0} replies</span>
                          </span>

                          {isAuthorOrAdmin && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeletePost(post.id);
                              }}
                              className="text-gray-400 hover:text-red-600 p-1 transition-colors"
                              title="Delete post"
                            >
                              <TrashIcon className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
      
      {/* 2. SINGLE POST VIEW (High Contrast and Perfectly Visible) */}
      {view === 'POST' && selectedPost && (
        <div className="space-y-6">
          {/* Top Bar Navigation */}
          <div className="flex items-center justify-between pb-3 border-b border-gray-200">
            <Button 
              onClick={() => { setView('LIST'); setError(''); }} 
              className="bg-gray-100 hover:bg-gray-200 text-gray-900 border border-gray-300 font-bold px-4 py-2 rounded-lg flex items-center gap-1.5 transition-colors shadow-xs"
            >
              <ArrowLeftIcon className="w-4 h-4 text-gray-800" />
              <span>Back to Discussions</span>
            </Button>

            {user && (user.type === 'admin' || user.name === selectedPost.author) && (
              <button
                onClick={() => handleDeletePost(selectedPost.id)}
                className="inline-flex items-center gap-1 text-xs text-red-600 hover:text-red-800 font-bold bg-red-50 hover:bg-red-100 border border-red-200 px-3 py-1.5 rounded-lg transition-colors"
              >
                <TrashIcon className="w-3.5 h-3.5" />
                <span>Delete Post</span>
              </button>
            )}
          </div>

          {/* Main Post Header & Content */}
          <div className="bg-white rounded-xl">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 leading-tight mb-2 tracking-tight">
              {selectedPost.title}
            </h1>
            
            <div className="flex flex-wrap items-center gap-2 text-xs text-gray-600 mb-4 pb-3 border-b border-gray-100">
              <span>Posted by <strong className="font-bold text-green-900">{selectedPost.author}</strong></span>
              <span>•</span>
              <span>{new Date(selectedPost.created_at).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}</span>
            </div>

            {/* Post Body with Explicit High Contrast Text */}
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-5 text-gray-900 text-base sm:text-lg leading-relaxed whitespace-pre-wrap font-normal">
              {selectedPost.content}
            </div>

            {/* Attached Post Images */}
            {(selectedPost.images && selectedPost.images.length > 0) && (
              <div className="mt-4 pt-4 border-t border-gray-100">
                <p className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Attached Photos:</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {selectedPost.images.map((imgUrl, i) => (
                    <a 
                      key={i} 
                      href={imgUrl} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="block rounded-lg overflow-hidden border border-gray-200 hover:opacity-95 transition-opacity"
                    >
                      <img src={imgUrl} alt={`Attachment ${i + 1}`} className="w-full h-40 object-cover" />
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Replies Section */}
          <div className="mt-8 pt-6 border-t-2 border-gray-200">
            <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <MessageSquareIcon className="w-5 h-5 text-green-700" />
              <span>Community Replies ({selectedPost.replies?.length || 0})</span>
            </h2>

            {(!selectedPost.replies || selectedPost.replies.length === 0) ? (
              <div className="bg-gray-50 rounded-xl p-4 text-center border border-dashed border-gray-300 text-gray-600 text-sm italic mb-6">
                No replies yet. Share your experience, remedies, or advice for this farmer below!
              </div>
            ) : (
              <div className="space-y-3 mb-6">
                {selectedPost.replies.map((reply) => (
                  <div 
                    key={reply.id} 
                    className="bg-gray-50 border border-gray-200 rounded-xl p-4 text-gray-900 shadow-xs"
                  >
                    <div className="flex justify-between items-center mb-2 pb-1.5 border-b border-gray-200">
                      <span className="font-bold text-sm text-green-900 flex items-center gap-1.5">
                        <UserCircleIcon className="w-4 h-4 text-green-700" />
                        {reply.author}
                      </span>
                      <span className="text-xs text-gray-500">
                        {new Date(reply.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>

                    <div className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap">
                      {reply.content}
                    </div>

                    {/* Reply attached images */}
                    {reply.images && reply.images.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-3 pt-2 border-t border-gray-200">
                        {reply.images.map((imgUrl, idx) => (
                          <a key={idx} href={imgUrl} target="_blank" rel="noopener noreferrer">
                            <img src={imgUrl} alt="Reply attachment" className="w-20 h-20 object-cover rounded-lg border border-gray-200" />
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Add Reply Form */}
            <div className="bg-green-50/50 border border-green-200 rounded-xl p-4 sm:p-5 mt-4">
              <h3 className="text-base font-bold text-gray-900 mb-2">Leave a Reply</h3>
              
              {error && (
                <div role="alert" className="error-notification p-3 bg-red-100 border border-red-400 text-black font-semibold text-xs rounded-lg mb-3">
                  {error}
                </div>
              )}

              <form onSubmit={handleAddReply} className="space-y-3">
                <div>
                  <textarea 
                    value={newReplyContent} 
                    onChange={e => setNewReplyContent(e.target.value)} 
                    className="w-full border border-gray-300 rounded-xl p-3 text-sm text-black placeholder-gray-600 bg-white focus:ring-2 focus:ring-green-500 focus:outline-none" 
                    placeholder="Write your advice, organic treatment recommendation, or follow-up question..." 
                    rows={3}
                    required
                  />
                </div>

                {/* Reply File Previews */}
                {newReplyPreviews.length > 0 && (
                  <div className="flex flex-wrap gap-2 pt-1">
                    {newReplyPreviews.map((preview, i) => (
                      <div key={i} className="relative w-16 h-16 rounded-lg overflow-hidden border border-gray-300">
                        <img src={preview} alt="Preview" className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => removeReplyFile(i)}
                          className="absolute top-0.5 right-0.5 bg-black/60 text-white rounded-full p-0.5"
                        >
                          <XIcon className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
                  <div>
                    <input 
                      type="file" 
                      ref={replyFileInputRef}
                      onChange={e => handleImageChange(e, 'reply')} 
                      accept="image/*" 
                      multiple 
                      className="hidden" 
                    />
                    <button
                      type="button"
                      onClick={() => replyFileInputRef.current?.click()}
                      className="inline-flex items-center gap-1.5 text-xs text-gray-700 bg-white hover:bg-gray-100 border border-gray-300 font-semibold px-3 py-1.5 rounded-lg transition-colors"
                    >
                      <PaperClipIcon className="w-3.5 h-3.5 text-gray-500" />
                      <span>Attach Photo</span>
                    </button>
                  </div>

                  <Button 
                    type="submit" 
                    isLoading={isSubmitting}
                    disabled={isSubmitting || !newReplyContent.trim()}
                    className="px-5 py-2 font-bold"
                  >
                    Post Reply
                  </Button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* 3. CREATE NEW POST VIEW (High Contrast and Explicitly Visible) */}
      {view === 'CREATE' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-gray-200">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-green-100 rounded-lg text-green-700">
                <PlusIcon className="w-5 h-5 text-green-700" />
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Create Discussion Post</h2>
            </div>

            <Button 
              onClick={() => { setView('LIST'); setError(''); }} 
              className="bg-gray-100 hover:bg-gray-200 text-gray-800 border border-gray-300 font-semibold px-3 py-1.5 text-xs"
            >
              Cancel
            </Button>
          </div>

          {error && (
            <div role="alert" className="error-notification p-3 bg-red-100 border border-red-400 text-black font-semibold text-xs rounded-lg">
              {error}
            </div>
          )}

          <form onSubmit={handleCreatePost} className="space-y-4">
            <div>
              <label className="block text-sm font-bold text-black mb-1">
                Post Title *
              </label>
              <input 
                type="text"
                value={newPostTitle} 
                onChange={e => setNewPostTitle(e.target.value)} 
                className="w-full border border-gray-300 rounded-xl p-3 text-sm text-black placeholder-gray-600 bg-white focus:ring-2 focus:ring-green-500 focus:outline-none" 
                placeholder="e.g. Yellowing leaves and black spots on my plantain farm in Koforidua" 
                required
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-black mb-1">
                Detailed Description & Symptoms *
              </label>
              <textarea 
                value={newPostContent} 
                onChange={e => setNewPostContent(e.target.value)} 
                rows={6} 
                className="w-full border border-gray-300 rounded-xl p-3 text-sm text-black placeholder-gray-600 bg-white focus:ring-2 focus:ring-green-500 focus:outline-none leading-relaxed" 
                placeholder="Describe what you observed, crop variety, watering schedule, symptoms, recent rains, fertilizers used, or any diagnosis reports you'd like to share..." 
                required
              />
            </div>

            {/* Photo Attachments */}
            <div>
              <label className="block text-sm font-bold text-black mb-1">
                Attach Photos (Optional)
              </label>
              <input 
                type="file" 
                ref={postFileInputRef}
                multiple 
                accept="image/*"
                onChange={e => handleImageChange(e, 'post')} 
                className="hidden"
              />

              <div 
                onClick={() => postFileInputRef.current?.click()}
                className="border-2 border-dashed border-gray-300 hover:border-green-500 hover:bg-green-50/50 rounded-xl p-4 text-center cursor-pointer transition-colors"
              >
                <UploadIcon className="w-6 h-6 text-gray-400 mx-auto mb-1" />
                <p className="text-xs font-semibold text-gray-700">Click to upload plant or farm photos</p>
                <p className="text-[11px] text-gray-400">PNG, JPG, WebP up to 10MB</p>
              </div>

              {/* Previews */}
              {newPostPreviews.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-3">
                  {newPostPreviews.map((preview, i) => (
                    <div key={i} className="relative w-20 h-20 rounded-lg overflow-hidden border border-gray-300">
                      <img src={preview} alt="Upload Preview" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => removePostFile(i)}
                        className="absolute top-1 right-1 bg-black/70 text-white rounded-full p-0.5"
                      >
                        <XIcon className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
              <Button 
                type="button" 
                onClick={() => setView('LIST')} 
                className="bg-gray-100 hover:bg-gray-200 text-gray-800 border border-gray-300"
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                isLoading={isSubmitting}
                disabled={isSubmitting || !newPostTitle.trim() || !newPostContent.trim()}
                className="px-6 font-bold shadow-md"
              >
                Publish Discussion
              </Button>
            </div>
          </form>
        </div>
      )}
    </Card>
  );
};

export default CommunityForum;
