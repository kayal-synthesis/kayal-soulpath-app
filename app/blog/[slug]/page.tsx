'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { ShareButton } from '@/components/ui/ShareButton'
import { 
  ArrowLeft, 
  Calendar, 
  User, 
  Tag, 
  Clock,
  Heart,
  MessageCircle,
  Twitter,
  Facebook,
  Linkedin,
  Mail
} from 'lucide-react'
import { formatDate } from '@/lib/utils/formatting'
import { toast } from 'sonner'

export default function BlogPostPage() {
  const params = useParams()
  const router = useRouter()
  const slug = params.slug as string
  const [liked, setLiked] = useState(false)
  const [likeCount, setLikeCount] = useState(42)

  // Mock data - in real app, fetch from API
  const post = {
    id: '1',
    title: 'Understanding Your Life Path Number: A Complete Guide',
    content: `
      <p>Your life path number is the most important number in your numerology chart. It reveals your purpose, challenges, and opportunities in this lifetime. Calculated from your date of birth, this number stays with you from birth to death.</p>
      
      <h2>How to Calculate Your Life Path Number</h2>
      <p>To calculate your life path number, reduce your birth date to a single digit (or master number 11, 22, or 33). Here's how:</p>
      <p>For example, if you were born on March 17, 1992:<br>
      Month: 3<br>
      Day: 17 → 1 + 7 = 8<br>
      Year: 1992 → 1 + 9 + 9 + 2 = 21 → 2 + 1 = 3<br>
      Total: 3 + 8 + 3 = 14 → 1 + 4 = 5<br>
      Your life path number is 5.</p>
      
      <h2>Life Path Number Meanings</h2>
      
      <h3>Life Path 1: The Leader</h3>
      <p>You're here to lead, innovate, and pioneer. Independent and ambitious, you have the drive to create your own path. Your challenge is learning to collaborate and accept help from others.</p>
      
      <h3>Life Path 2: The Diplomat</h3>
      <p>Your purpose involves partnership, peacemaking, and cooperation. You have a natural ability to see both sides and bring harmony to conflicts. Avoid becoming too passive or dependent.</p>
      
      <h3>Life Path 3: The Creative</h3>
      <p>You're here to express yourself, inspire others, and find joy in creativity. Your communication skills are your greatest gift. Guard against scattering your energy.</p>
      
      <h3>Life Path 4: The Builder</h3>
      <p>Your path is about creating solid foundations through hard work and discipline. You're reliable, practical, and detail-oriented. Remember to stay flexible.</p>
      
      <h3>Life Path 5: The Explorer</h3>
      <p>Freedom and adventure define your journey. You're here to experience life fully and embrace change. Your challenge is commitment and follow-through.</p>
      
      <h3>Life Path 6: The Nurturer</h3>
      <p>Your purpose involves service, responsibility, and creating harmony. You're the natural caretaker and healer. Avoid becoming overly burdened by others' problems.</p>
      
      <h3>Life Path 7: The Seeker</h3>
      <p>You're here to analyze, question, and seek deeper truths. Your analytical mind and intuition are powerful. Guard against isolation and skepticism.</p>
      
      <h3>Life Path 8: The Achiever</h3>
      <p>Your path involves material success, power, and abundance. You have the potential for great achievement. Remember that true wealth includes giving back.</p>
      
      <h3>Life Path 9: The Humanitarian</h3>
      <p>You're here to serve humanity with wisdom and compassion. Your global perspective and tolerance are gifts. Avoid becoming detached or aloof.</p>
      
      <h3>Master Numbers: 11, 22, 33</h3>
      <p>These numbers carry higher spiritual vibrations. 11 is the visionary, 22 the master builder, and 33 the master teacher. They bring great potential but also great challenge.</p>
    `,
    author: {
      name: 'Sarah Chen',
      role: 'Numerology Expert',
      bio: 'Sarah has studied numerology for over 15 years and has helped thousands discover their life purpose through numbers.'
    },
    publishedAt: '2024-02-15',
    readTime: 8,
    category: 'Numerology',
    tags: ['life path', 'numerology', 'destiny', 'personal growth'],
    relatedPosts: [
      {
        slug: 'palmistry-basics-reading-your-heart-line',
        title: 'Palmistry Basics: What Your Heart Line Reveals',
        readTime: 6
      },
      {
        slug: 'face-reading-guide-physiognomy',
        title: 'Face Reading 101: An Introduction to Physiognomy',
        readTime: 7
      },
      {
        slug: 'personal-year-forecast-2024',
        title: 'Your Personal Year Forecast: What 2024 Has in Store',
        readTime: 5
      }
    ]
  }

  const handleLike = () => {
    setLiked(!liked)
    setLikeCount(prev => liked ? prev - 1 : prev + 1)
    if (!liked) {
      toast.success('Thanks for liking this article!')
    }
  }

  const shareUrl = `https://kayalsoulpath.com/blog/${slug}`

  return (
    <div className="min-h-screen">
      {/* Hero */}
      <div className="bg-gradient-to-br from-primary-900 to-primary-800 text-white py-12">
        <div className="max-w-4xl mx-auto px-4">
          <Link href="/blog" className="inline-flex items-center text-white/80 hover:text-white mb-6">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Blog
          </Link>
          
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-3xl md:text-4xl font-serif mb-4"
          >
            {post.title}
          </motion.h1>
          
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="flex flex-wrap items-center gap-4 text-white/80"
          >
            <div className="flex items-center gap-2">
              <User className="w-4 h-4" />
              <span>{post.author.name}</span>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              <span>{formatDate(post.publishedAt)}</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              <span>{post.readTime} min read</span>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 py-12">
        <div className="grid md:grid-cols-4 gap-8">
          {/* Main Content */}
          <div className="md:col-span-3">
            <Card className="prose prose-lg max-w-none">
              <div dangerouslySetInnerHTML={{ __html: post.content }} />
              
              {/* Tags */}
              <div className="flex flex-wrap gap-2 mt-8 pt-8 border-t">
                <Tag className="w-4 h-4 text-neutral-400" />
                {post.tags.map((tag) => (
                  <Link
                    key={tag}
                    href={`/blog?tag=${tag}`}
                    className="px-3 py-1 bg-neutral-100 text-sm rounded-full hover:bg-neutral-200 transition"
                  >
                    {tag}
                  </Link>
                ))}
              </div>
            </Card>

            {/* Author Bio */}
            <Card className="mt-8">
              <div className="flex gap-4">
                <div className="w-16 h-16 bg-gradient-to-br from-primary-600 to-primary-800 rounded-full flex items-center justify-center text-white text-2xl font-serif">
                  {post.author.name.charAt(0)}
                </div>
                <div>
                  <h3 className="font-medium mb-1">{post.author.name}</h3>
                  <p className="text-sm text-primary-600 mb-2">{post.author.role}</p>
                  <p className="text-sm text-neutral-600">{post.author.bio}</p>
                </div>
              </div>
            </Card>

            {/* Comments Section */}
            <Card className="mt-8">
              <h3 className="text-lg font-medium mb-4">Comments (0)</h3>
              <p className="text-neutral-500 text-center py-8">
                Comments are coming soon! Share this article on social media to start the conversation.
              </p>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="md:col-span-1">
            {/* Share */}
            <Card className="mb-6 sticky top-24">
              <h3 className="font-medium mb-4">Share</h3>
              <div className="flex flex-col gap-2">
                <button className="flex items-center gap-3 p-2 hover:bg-blue-50 rounded-lg transition">
                  <Twitter className="w-5 h-5 text-blue-400" />
                  <span className="text-sm">Twitter</span>
                </button>
                <button className="flex items-center gap-3 p-2 hover:bg-blue-50 rounded-lg transition">
                  <Facebook className="w-5 h-5 text-blue-600" />
                  <span className="text-sm">Facebook</span>
                </button>
                <button className="flex items-center gap-3 p-2 hover:bg-blue-50 rounded-lg transition">
                  <Linkedin className="w-5 h-5 text-blue-700" />
                  <span className="text-sm">LinkedIn</span>
                </button>
                <button className="flex items-center gap-3 p-2 hover:bg-neutral-50 rounded-lg transition">
                  <Mail className="w-5 h-5 text-neutral-600" />
                  <span className="text-sm">Email</span>
                </button>
              </div>

              <div className="mt-4 pt-4 border-t">
                <button
                  onClick={handleLike}
                  className="flex items-center gap-2 text-sm"
                >
                  <Heart className={`w-5 h-5 ${liked ? 'fill-red-500 text-red-500' : ''}`} />
                  <span>{likeCount} likes</span>
                </button>
              </div>
            </Card>

            {/* Related Posts */}
            <Card className="sticky top-24" style={{ top: 'calc(24px + 200px)' }}>
              <h3 className="font-medium mb-4">Related Posts</h3>
              <div className="space-y-4">
                {post.relatedPosts.map((related) => (
                  <Link key={related.slug} href={`/blog/${related.slug}`}>
                    <div className="group cursor-pointer">
                      <h4 className="text-sm font-medium group-hover:text-primary-600 transition mb-1">
                        {related.title}
                      </h4>
                      <p className="text-xs text-neutral-500">{related.readTime} min read</p>
                    </div>
                  </Link>
                ))}
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}