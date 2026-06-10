'use client'

import { motion } from 'framer-motion'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Heart, Sparkles, Users, Globe, Star, Award } from 'lucide-react'
import Link from 'next/link'

export default function AboutPage() {
  const values = [
    {
      icon: Heart,
      title: 'Authenticity',
      description: 'We believe in genuine self-discovery, not generic horoscopes.'
    },
    {
      icon: Sparkles,
      title: 'Wisdom',
      description: 'Ancient knowledge combined with modern technology.'
    },
    {
      icon: Users,
      title: 'Community',
      description: 'A supportive space for seekers to connect and grow.'
    },
    {
      icon: Globe,
      title: 'Accessibility',
      description: 'Making ancient wisdom accessible to everyone.'
    },
    {
      icon: Star,
      title: 'Excellence',
      description: 'Commitment to quality in every insight we provide.'
    },
    {
      icon: Award,
      title: 'Integrity',
      description: 'Your privacy and trust are our highest priority.'
    }
  ]

  const team = [
    {
      name: 'Sarah Chen',
      role: 'Founder & CEO',
      bio: 'Numerologist and spiritual guide with 15+ years of experience.',
      image: '/team/sarah.jpg'
    },
    {
      name: 'Dr. Michael Patel',
      role: 'Chief Palmistry Expert',
      bio: 'PhD in Ancient Wisdom Studies, certified palm reader.',
      image: '/team/michael.jpg'
    },
    {
      name: 'Priya Sharma',
      role: 'Head of Physiognomy',
      bio: 'Expert in facial analysis and spiritual counseling.',
      image: '/team/priya.jpg'
    },
    {
      name: 'David Kim',
      role: 'Lead Engineer',
      bio: 'Building technology that bridges ancient and modern.',
      image: '/team/david.jpg'
    }
  ]

  return (
    <div className="min-h-screen">
      {/* Hero */}
      <div className="bg-gradient-to-br from-primary-900 to-primary-800 text-white py-20">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-4xl md:text-5xl font-serif mb-6"
          >
            Our Mission: Help You Discover Your True Self
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-xl text-white/80 max-w-2xl mx-auto"
          >
            We're combining ancient wisdom with modern technology to create the most 
            comprehensive personal insight platform in the world.
          </motion.p>
        </div>
      </div>

      {/* Story */}
      <div className="max-w-4xl mx-auto px-4 py-20">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl font-serif mb-4">Our Story</h2>
          <div className="space-y-4 text-neutral-600">
            <p>
              Kayal LifeOS was born from a simple observation: ancient wisdom systems 
              like numerology, palmistry, and physiognomy have helped people understand 
              themselves for thousands of years, but they've never been accessible in one place.
            </p>
            <p>
              Our founder, Sarah Chen, spent years studying these traditions across India, 
              China, and Europe. She realized that when combined, they provide a complete 
              picture of a person's life path, purpose, and potential.
            </p>
            <p>
              Today, we've brought together experts in each field and paired them with 
              cutting-edge AI to create the first integrated platform of its kind. 
              We're helping thousands of people around the world discover who they really are.
            </p>
          </div>
        </motion.div>

        {/* Values */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-16"
        >
          <h2 className="text-3xl font-serif text-center mb-12">Our Values</h2>
          <div className="grid md:grid-cols-3 gap-6">
            {values.map((value, index) => {
              const Icon = value.icon
              return (
                <Card key={index} className="text-center hover:shadow-lg transition">
                  <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Icon className="w-8 h-8 text-primary-600" />
                  </div>
                  <h3 className="text-lg font-medium mb-2">{value.title}</h3>
                  <p className="text-sm text-neutral-600">{value.description}</p>
                </Card>
              )
            })}
          </div>
        </motion.div>

        {/* Team */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <h2 className="text-3xl font-serif text-center mb-12">Meet Our Team</h2>
          <div className="grid md:grid-cols-2 gap-6">
            {team.map((member, index) => (
              <Card key={index} className="flex gap-4 items-start">
                <div className="w-20 h-20 bg-gradient-to-br from-primary-600 to-primary-800 rounded-full flex items-center justify-center text-white text-2xl font-serif">
                  {member.name.charAt(0)}
                </div>
                <div>
                  <h3 className="text-lg font-medium">{member.name}</h3>
                  <p className="text-sm text-primary-600 mb-2">{member.role}</p>
                  <p className="text-sm text-neutral-600">{member.bio}</p>
                </div>
              </Card>
            ))}
          </div>
        </motion.div>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mt-16 text-center"
        >
          <Card className="bg-gradient-to-r from-primary-50 to-secondary-50">
            <h3 className="text-2xl font-serif mb-4">Ready to Begin Your Journey?</h3>
            <p className="text-neutral-600 mb-6 max-w-2xl mx-auto">
              Join thousands of seekers who've already discovered their true selves.
            </p>
            <Link href="/onboarding/basic">
              <Button size="lg">Get Started — It's Free</Button>
            </Link>
          </Card>
        </motion.div>
      </div>
    </div>
  )
}