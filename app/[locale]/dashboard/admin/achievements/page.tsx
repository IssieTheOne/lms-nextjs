"use client"

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'
import { Plus, Edit, Trash2, Trophy, Sparkles } from 'lucide-react'
import { createDefaultBadges } from '@/lib/xp-system'

interface Achievement {
  id: string
  name: string
  description: string | null
  icon_url: string | null
  criteria: any
  created_at: string
}

export default function AchievementsPage() {
  const [achievements, setAchievements] = useState<Achievement[]>([])
  const [loading, setLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    icon_url: '',
    criteria: ''
  })

  const supabase = createClient()

  useEffect(() => {
    fetchAchievements()
  }, [])

  const fetchAchievements = async () => {
    try {
      const { data, error } = await supabase
        .from('badges')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      setAchievements(data || [])
    } catch (error) {
      console.error('Error fetching achievements:', error)
      toast.error('Failed to load achievements')
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.name.trim()) {
      toast.error('Achievement name is required')
      return
    }

    try {
      let criteria = null
      if (formData.criteria.trim()) {
        try {
          criteria = JSON.parse(formData.criteria)
        } catch {
          toast.error('Invalid JSON in criteria field')
          return
        }
      }

      const achievementData = {
        name: formData.name.trim(),
        description: formData.description.trim() || null,
        icon_url: formData.icon_url.trim() || null,
        criteria: criteria
      }

      const { data, error } = await supabase
        .from('badges')
        .insert(achievementData)
        .select()
        .single()

      if (error) throw error

      setAchievements(prev => [data, ...prev])
      setFormData({
        name: '',
        description: '',
        icon_url: '',
        criteria: ''
      })
      setIsDialogOpen(false)
      toast.success('Achievement created successfully!')
    } catch (error) {
      console.error('Error creating achievement:', error)
      toast.error('Failed to create achievement')
    }
  }

  const createDefaultAchievements = async () => {
    try {
      await createDefaultBadges()
      toast.success('Default achievements created successfully!')
      fetchAchievements()
    } catch (error) {
      console.error('Error creating default achievements:', error)
      toast.error('Failed to create default achievements')
    }
  }

  const deleteAchievement = async (achievementId: string) => {
    if (!confirm('Are you sure you want to delete this achievement?')) {
      return
    }

    try {
      const { error } = await supabase
        .from('badges')
        .delete()
        .eq('id', achievementId)

      if (error) throw error

      setAchievements(achievements.filter(achievement => achievement.id !== achievementId))
      toast.success('Achievement deleted successfully')
    } catch (error) {
      console.error('Error deleting achievement:', error)
      toast.error('Failed to delete achievement')
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <h2 className="text-3xl font-bold">Manage Achievements</h2>
        <div className="flex items-center justify-center h-64">
          <div className="text-lg">Loading achievements...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold">Manage Achievements</h2>
        <div className="flex gap-2">
          <Button variant="outline" onClick={createDefaultAchievements}>
            <Sparkles className="h-4 w-4 mr-2" />
            Create Default Badges
          </Button>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Achievement
              </Button>
            </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Create New Achievement</DialogTitle>
              <DialogDescription>
                Add a new achievement badge for students to earn.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Achievement Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  placeholder="Enter achievement name"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => handleInputChange('description', e.target.value)}
                  placeholder="Enter achievement description"
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="icon_url">Icon URL</Label>
                <Input
                  id="icon_url"
                  value={formData.icon_url}
                  onChange={(e) => handleInputChange('icon_url', e.target.value)}
                  placeholder="https://example.com/icon.png"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="criteria">Criteria (JSON)</Label>
                <Textarea
                  id="criteria"
                  value={formData.criteria}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => handleInputChange('criteria', e.target.value)}
                  placeholder='{"type": "completion", "value": 5}'
                  rows={2}
                />
                <p className="text-xs text-muted-foreground">
                  JSON object defining achievement criteria
                </p>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit">Create Achievement</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Achievements</CardTitle>
          <CardDescription>
            View and manage achievement badges that students can earn
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {achievements.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No achievements found. Create your first achievement to get started.
              </div>
            ) : (
              achievements.map((achievement) => (
                <div key={achievement.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="space-y-2 flex-1">
                    <div className="flex items-center gap-3">
                      <Trophy className="h-5 w-5 text-yellow-500" />
                      <h3 className="font-semibold text-lg">{achievement.name}</h3>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {achievement.description || 'No description'}
                    </p>
                    {achievement.criteria && (
                      <div className="text-xs text-muted-foreground">
                        Criteria: {JSON.stringify(achievement.criteria)}
                      </div>
                    )}
                    <div className="text-xs text-muted-foreground">
                      Created: {new Date(achievement.created_at).toLocaleDateString()}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm">
                      <Edit className="h-4 w-4 mr-1" />
                      Edit
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => deleteAchievement(achievement.id)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4 mr-1" />
                      Delete
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}