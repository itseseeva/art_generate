import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Mail, MapPin, LinkIcon, Github, Twitter, Linkedin, Calendar, Award, TrendingUp } from 'lucide-react'

export default function UserProfile() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header Section */}
      <div className="border-b border-border">
        <div className="container mx-auto px-4 py-8 md:px-6 lg:px-8">
          <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
            <div className="flex flex-col gap-6 md:flex-row md:items-center">
              <Avatar className="h-24 w-24 border-2 border-primary/20 md:h-32 md:w-32">
                <AvatarImage src="/professional-developer-portrait.png" alt="Alex Morrison" />
                <AvatarFallback className="bg-primary text-primary-foreground text-3xl font-semibold">AM</AvatarFallback>
              </Avatar>
              
              <div className="space-y-3">
                <div>
                  <h1 className="text-3xl font-bold tracking-tight text-foreground md:text-4xl">Alex Morrison</h1>
                  <p className="text-lg text-muted-foreground mt-1">Senior Full-Stack Developer</p>
                </div>
                
                <div className="flex flex-wrap gap-2">
                  <Badge variant="secondary" className="gap-1.5">
                    <MapPin className="h-3 w-3" />
                    San Francisco, CA
                  </Badge>
                  <Badge variant="secondary" className="gap-1.5">
                    <Calendar className="h-3 w-3" />
                    Joined March 2022
                  </Badge>
                </div>
              </div>
            </div>
            
            <div className="flex gap-2">
              <Button size="lg" className="gap-2">
                <Mail className="h-4 w-4" />
                Contact
              </Button>
              <Button size="lg" variant="outline" className="gap-2">
                <LinkIcon className="h-4 w-4" />
                Share
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 md:px-6 lg:px-8">
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Main Content */}
          <div className="space-y-6 lg:col-span-2">
            {/* About Section */}
            <Card className="border-border">
              <CardContent className="p-6">
                <h2 className="text-xl font-semibold text-foreground mb-4">About</h2>
                <p className="text-muted-foreground leading-relaxed">
                  Passionate full-stack developer with 8+ years of experience building scalable web applications. 
                  Specialized in React, Node.js, and modern cloud architectures. I love crafting intuitive user 
                  experiences and solving complex technical challenges. Always exploring new technologies and 
                  contributing to open-source projects.
                </p>
              </CardContent>
            </Card>

            {/* Stats Grid */}
            <div className="grid gap-4 sm:grid-cols-3">
              <Card className="border-border bg-card/50 backdrop-blur-sm">
                <CardContent className="p-6">
                  <div className="flex items-center gap-3">
                    <div className="rounded-lg bg-primary/10 p-3">
                      <Award className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-foreground">247</p>
                      <p className="text-sm text-muted-foreground">Projects</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-border bg-card/50 backdrop-blur-sm">
                <CardContent className="p-6">
                  <div className="flex items-center gap-3">
                    <div className="rounded-lg bg-chart-2/10 p-3">
                      <TrendingUp className="h-5 w-5 text-chart-2" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-foreground">12.5k</p>
                      <p className="text-sm text-muted-foreground">Followers</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-border bg-card/50 backdrop-blur-sm">
                <CardContent className="p-6">
                  <div className="flex items-center gap-3">
                    <div className="rounded-lg bg-chart-3/10 p-3">
                      <Github className="h-5 w-5 text-chart-3" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-foreground">1,840</p>
                      <p className="text-sm text-muted-foreground">Contributions</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Recent Activity */}
            <Card className="border-border">
              <CardContent className="p-6">
                <h2 className="text-xl font-semibold text-foreground mb-4">Recent Activity</h2>
                <div className="space-y-4">
                  {[
                    { action: "Published", item: "Building Scalable APIs with Node.js", time: "2 hours ago", type: "article" },
                    { action: "Completed", item: "E-commerce Dashboard Redesign", time: "1 day ago", type: "project" },
                    { action: "Contributed to", item: "react-query", time: "3 days ago", type: "open-source" },
                    { action: "Started", item: "AI-Powered Analytics Platform", time: "5 days ago", type: "project" },
                  ].map((activity, index) => (
                    <div key={index} className="flex items-start gap-4 pb-4 border-b border-border last:border-0 last:pb-0">
                      <div className={`mt-0.5 h-2 w-2 rounded-full ${
                        activity.type === 'article' ? 'bg-primary' : 
                        activity.type === 'project' ? 'bg-chart-2' : 'bg-chart-3'
                      }`} />
                      <div className="flex-1 space-y-1">
                        <p className="text-sm text-foreground">
                          <span className="text-muted-foreground">{activity.action}</span>{' '}
                          <span className="font-medium">{activity.item}</span>
                        </p>
                        <p className="text-xs text-muted-foreground">{activity.time}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Skills */}
            <Card className="border-border">
              <CardContent className="p-6">
                <h2 className="text-xl font-semibold text-foreground mb-4">Skills</h2>
                <div className="flex flex-wrap gap-2">
                  {['React', 'TypeScript', 'Node.js', 'Next.js', 'PostgreSQL', 'Docker', 'AWS', 'GraphQL', 'Tailwind CSS', 'Python'].map((skill) => (
                    <Badge key={skill} variant="outline" className="bg-muted/50">
                      {skill}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Social Links */}
            <Card className="border-border">
              <CardContent className="p-6">
                <h2 className="text-xl font-semibold text-foreground mb-4">Connect</h2>
                <div className="space-y-3">
                  {[
                    { icon: Github, label: 'github.com/alexmorrison', href: '#' },
                    { icon: Twitter, label: '@alexmorrison', href: '#' },
                    { icon: Linkedin, label: 'linkedin.com/in/alexmorrison', href: '#' },
                    { icon: LinkIcon, label: 'alexmorrison.dev', href: '#' },
                  ].map((link, index) => (
                    <a
                      key={index}
                      href={link.href}
                      className="flex items-center gap-3 rounded-lg p-2 text-sm text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
                    >
                      <link.icon className="h-4 w-4" />
                      <span>{link.label}</span>
                    </a>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Achievements */}
            <Card className="border-border">
              <CardContent className="p-6">
                <h2 className="text-xl font-semibold text-foreground mb-4">Achievements</h2>
                <div className="space-y-4">
                  {[
                    { title: 'Top Contributor', desc: 'Most active member this month', color: 'bg-chart-3' },
                    { title: 'Code Master', desc: '1000+ commits this year', color: 'bg-primary' },
                    { title: 'Team Player', desc: 'Helped 50+ developers', color: 'bg-chart-2' },
                  ].map((achievement, index) => (
                    <div key={index} className="flex items-start gap-3">
                      <div className={`${achievement.color} h-10 w-10 rounded-lg flex items-center justify-center`}>
                        <Award className="h-5 w-5 text-background" />
                      </div>
                      <div>
                        <p className="font-medium text-sm text-foreground">{achievement.title}</p>
                        <p className="text-xs text-muted-foreground">{achievement.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
