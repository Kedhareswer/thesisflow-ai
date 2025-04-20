import { usePathname } from "next/navigation"
import Link from "next/link"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { ModeToggle } from "@/components/mode-toggle"
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
} from "@/components/ui/navigation-menu"
import { 
  LayoutDashboard, 
  Search, 
  Users, 
  FileText, 
  Lightbulb,
  MessageSquare,
  Settings,
  Menu
} from "lucide-react"
import * as DropdownMenuPrimitive from "@radix-ui/react-dropdown-menu"

export default function MainNav() {
  const pathname = usePathname()

  const navItems = [
    {
      title: "Dashboard",
      href: "/dashboard",
      icon: <LayoutDashboard className="h-4 w-4" />,
      description: "Overview of your research activities"
    },
    {
      title: "Research Explorer",
      href: "/explorer",
      icon: <Search className="h-4 w-4" />,
      description: "Discover and explore research topics"
    },
    {
      title: "Collaborate",
      href: "/collaborate",
      icon: <Users className="h-4 w-4" />,
      description: "Work with your team"
    },
    {
      title: "Summarizer",
      href: "/summarizer",
      icon: <FileText className="h-4 w-4" />,
      description: "Summarize research papers"
    },
    {
      title: "Ideas",
      href: "/ideas",
      icon: <Lightbulb className="h-4 w-4" />,
      description: "Manage research ideas"
    }
  ]

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center">
        <Link href="/" className="flex items-center space-x-2">
          <MessageSquare className="h-6 w-6" />
          <span className="font-bold">ResearchBolt</span>
        </Link>

        {/* Desktop Navigation */}
        <div className="hidden md:flex md:flex-1">
          <NavigationMenu className="ml-6">
            <NavigationMenuList>
              <NavigationMenuItem>
                <NavigationMenuTrigger>Research Tools</NavigationMenuTrigger>
                <NavigationMenuContent>
                  <ul className="grid w-[400px] gap-3 p-4 md:w-[500px] md:grid-cols-2">
                    {navItems.map((item) => (
                      <li key={item.href}>
                        <NavigationMenuLink asChild>
                          <Link
                            href={item.href}
                            className={cn(
                              "block select-none space-y-1 rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground",
                              pathname === item.href
                                ? "bg-accent text-accent-foreground"
                                : "text-muted-foreground"
                            )}
                          >
                            <div className="flex items-center gap-2">
                              {item.icon}
                              <span className="text-sm font-medium">{item.title}</span>
                            </div>
                            <p className="line-clamp-2 text-sm leading-snug text-muted-foreground">
                              {item.description}
                            </p>
                          </Link>
                        </NavigationMenuLink>
                      </li>
                    ))}
                  </ul>
                </NavigationMenuContent>
              </NavigationMenuItem>
            </NavigationMenuList>
          </NavigationMenu>

          {/* Direct Navigation Links */}
          <nav className="flex items-center space-x-6 ml-6">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-2 text-sm font-medium transition-colors hover:text-primary",
                  pathname === item.href
                    ? "text-primary"
                    : "text-muted-foreground"
                )}
              >
                {item.icon}
                {item.title}
              </Link>
            ))}
          </nav>
        </div>

        {/* Mobile Navigation */}
        <div className="flex md:hidden flex-1 justify-end">
          <DropdownMenuPrimitive.Root>
            <DropdownMenuPrimitive.Trigger asChild>
              <Button variant="ghost" size="icon" className="md:hidden">
                <Menu className="h-5 w-5" />
                <span className="sr-only">Toggle menu</span>
              </Button>
            </DropdownMenuPrimitive.Trigger>
            <DropdownMenuPrimitive.Portal>
              <DropdownMenuPrimitive.Content
                align="end"
                className="w-[200px] rounded-md border bg-popover p-2 text-popover-foreground shadow-md"
              >
                {navItems.map((item) => (
                  <DropdownMenuPrimitive.Item
                    key={item.href}
                    className={cn(
                      "relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
                      pathname === item.href
                        ? "bg-accent text-accent-foreground"
                        : ""
                    )}
                  >
                    <Link
                      href={item.href}
                      className="flex w-full items-center gap-2"
                    >
                      {item.icon}
                      {item.title}
                    </Link>
                  </DropdownMenuPrimitive.Item>
                ))}
              </DropdownMenuPrimitive.Content>
            </DropdownMenuPrimitive.Portal>
          </DropdownMenuPrimitive.Root>
        </div>

        {/* Right Side Items */}
        <div className="ml-auto flex items-center space-x-4">
          <ModeToggle />
          <Button variant="ghost" size="icon">
            <Settings className="h-5 w-5" />
            <span className="sr-only">Settings</span>
          </Button>
        </div>
      </div>
    </header>
  )
} 