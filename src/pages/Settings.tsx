
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const Settings = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold mb-2">Settings</h1>
        <p className="text-muted-foreground">Manage your account and preferences.</p>
      </div>
      
      <Tabs defaultValue="profile" className="w-full">
        <TabsList className="mb-6">
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="account">Account</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="appearance">Appearance</TabsTrigger>
        </TabsList>
        
        <TabsContent value="profile" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Personal Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center gap-6">
                <Avatar className="h-20 w-20">
                  <AvatarImage src="" />
                  <AvatarFallback className="bg-research-300 text-white text-xl">JD</AvatarFallback>
                </Avatar>
                <div className="space-y-2">
                  <Button size="sm" variant="outline">Change Photo</Button>
                  <p className="text-xs text-muted-foreground">
                    JPG, GIF or PNG. 2MB max.
                  </p>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First Name</Label>
                  <Input id="firstName" defaultValue="John" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Last Name</Label>
                  <Input id="lastName" defaultValue="Doe" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" defaultValue="john@example.com" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="title">Title/Role</Label>
                  <Input id="title" defaultValue="Research Scientist" />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="bio">Bio</Label>
                <textarea 
                  id="bio" 
                  className="w-full min-h-[100px] rounded-md border border-input bg-transparent px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  placeholder="Tell us about yourself"
                  defaultValue="Research scientist specializing in quantum computing and machine learning"
                />
              </div>
              
              <div className="flex justify-end">
                <Button>Save Changes</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="account" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Account Preferences</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="language">Language</Label>
                <Select defaultValue="en">
                  <SelectTrigger>
                    <SelectValue placeholder="Select language" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="en">English</SelectItem>
                    <SelectItem value="fr">French</SelectItem>
                    <SelectItem value="de">German</SelectItem>
                    <SelectItem value="es">Spanish</SelectItem>
                    <SelectItem value="zh">Chinese</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="timezone">Timezone</Label>
                <Select defaultValue="utc-8">
                  <SelectTrigger>
                    <SelectValue placeholder="Select timezone" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="utc-8">Pacific Time (UTC-8)</SelectItem>
                    <SelectItem value="utc-5">Eastern Time (UTC-5)</SelectItem>
                    <SelectItem value="utc+0">Greenwich Mean Time (UTC+0)</SelectItem>
                    <SelectItem value="utc+1">Central European Time (UTC+1)</SelectItem>
                    <SelectItem value="utc+8">China Standard Time (UTC+8)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-4">
                <h3 className="text-sm font-medium">Security</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="current-password">Current Password</Label>
                    <Input id="current-password" type="password" />
                  </div>
                  <div />
                  <div className="space-y-2">
                    <Label htmlFor="new-password">New Password</Label>
                    <Input id="new-password" type="password" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirm-password">Confirm New Password</Label>
                    <Input id="confirm-password" type="password" />
                  </div>
                </div>
              </div>
              
              <div className="flex justify-end">
                <Button>Update Password</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="notifications" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Notification Preferences</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <h3 className="text-sm font-medium">Email Notifications</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="email-comments" className="font-normal">Comment on your papers</Label>
                      <p className="text-xs text-muted-foreground">Get notified when someone comments on your research papers</p>
                    </div>
                    <Switch id="email-comments" defaultChecked />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="email-mentions" className="font-normal">Mentions and tags</Label>
                      <p className="text-xs text-muted-foreground">Get notified when someone mentions or tags you</p>
                    </div>
                    <Switch id="email-mentions" defaultChecked />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="email-papers" className="font-normal">New papers in your field</Label>
                      <p className="text-xs text-muted-foreground">Get notified about new papers in your research area</p>
                    </div>
                    <Switch id="email-papers" />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="email-news" className="font-normal">Platform updates</Label>
                      <p className="text-xs text-muted-foreground">Get notified about new features and updates</p>
                    </div>
                    <Switch id="email-news" defaultChecked />
                  </div>
                </div>
              </div>
              
              <div className="space-y-4">
                <h3 className="text-sm font-medium">In-App Notifications</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="app-activity" className="font-normal">Collaboration activity</Label>
                      <p className="text-xs text-muted-foreground">Get notified about activity in your collaborative projects</p>
                    </div>
                    <Switch id="app-activity" defaultChecked />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="app-mentions" className="font-normal">Mentions and tags</Label>
                      <p className="text-xs text-muted-foreground">Get notified when someone mentions or tags you</p>
                    </div>
                    <Switch id="app-mentions" defaultChecked />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="app-summary" className="font-normal">Summary completions</Label>
                      <p className="text-xs text-muted-foreground">Get notified when your paper summaries are ready</p>
                    </div>
                    <Switch id="app-summary" defaultChecked />
                  </div>
                </div>
              </div>
              
              <div className="flex justify-end">
                <Button>Save Preferences</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="appearance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Appearance Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <h3 className="text-sm font-medium">Theme</h3>
                <div className="grid grid-cols-3 gap-4">
                  <div className="border rounded-md p-3 cursor-pointer bg-background flex items-center justify-center h-24 hover:border-research-300">
                    <div className="text-center">
                      <div className="h-10 w-10 rounded-full bg-background border mx-auto mb-2"></div>
                      <span className="text-xs">Light</span>
                    </div>
                  </div>
                  <div className="border rounded-md p-3 cursor-pointer bg-zinc-900 text-white flex items-center justify-center h-24 hover:border-research-300">
                    <div className="text-center">
                      <div className="h-10 w-10 rounded-full bg-zinc-800 border border-zinc-700 mx-auto mb-2"></div>
                      <span className="text-xs">Dark</span>
                    </div>
                  </div>
                  <div className="border rounded-md p-3 cursor-pointer bg-background flex items-center justify-center h-24 hover:border-research-300">
                    <div className="text-center">
                      <div className="h-10 w-10 rounded-full bg-gradient-to-b from-background to-zinc-900 border mx-auto mb-2"></div>
                      <span className="text-xs">System</span>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="space-y-4">
                <h3 className="text-sm font-medium">Sidebar Position</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="border rounded-md p-3 cursor-pointer bg-background flex items-center justify-center h-20 hover:border-research-300">
                    <div className="flex items-center gap-2">
                      <div className="h-12 w-3 bg-muted rounded-sm"></div>
                      <div className="h-12 w-10 bg-muted rounded-sm"></div>
                    </div>
                  </div>
                  <div className="border rounded-md p-3 cursor-pointer bg-background flex items-center justify-center h-20 hover:border-research-300">
                    <div className="flex items-center gap-2">
                      <div className="h-12 w-10 bg-muted rounded-sm"></div>
                      <div className="h-12 w-3 bg-muted rounded-sm"></div>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="space-y-4">
                <h3 className="text-sm font-medium">Density</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="density-compact" className="font-normal">Compact Mode</Label>
                      <p className="text-xs text-muted-foreground">Use less space for UI elements (good for small screens)</p>
                    </div>
                    <Switch id="density-compact" />
                  </div>
                </div>
              </div>
              
              <div className="flex justify-end">
                <Button>Save Appearance</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Settings;
