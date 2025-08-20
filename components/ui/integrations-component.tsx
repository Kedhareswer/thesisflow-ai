import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { ChevronRight } from 'lucide-react'
import Link from 'next/link'
import * as React from 'react'

export default function IntegrationsSection() {
  const integrations = [
    {
      id: 'github',
      name: 'GitHub',
      description: 'Version control and collaboration platform for developers.',
      logo: (
        <svg className="w-10 h-10" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
        </svg>
      ),
      isConnected: false
    },
    {
      id: 'google-drive',
      name: 'Google Drive',
      description: 'Cloud storage and file collaboration service.',
      logo: (
        <svg className="w-10 h-10" viewBox="0 0 24 24" fill="currentColor">
          <path d="M7.71 4.963L1.178 15.59a2.079 2.079 0 0 0 .148 2.203c.4.6 1.076.983 1.802.983h13.744a2.08 2.08 0 0 0 1.95-1.354l3.198-8.863a2.08 2.08 0 0 0-.76-2.42L13.687.28a2.08 2.08 0 0 0-2.374 0L7.71 4.963zm1.29-.784L12.578 1.79c.19-.127.442-.127.632 0l7.573 5.39a.52.52 0 0 1 .19.605l-3.198 8.863a.52.52 0 0 1-.487.336H2.954a.52.52 0 0 1-.45-.246.52.52 0 0 1-.037-.551L9 4.18z"/>
          <path d="m10.5 6.615 1.5 2.598 1.5-2.598-1.5-2.598L10.5 6.615z"/>
        </svg>
      ),
      isConnected: false
    }
  ]

  return (
    <section>
      <div className="py-8">
        <div className="mx-auto max-w-5xl px-6">
          <div className="text-center">
            <h2 className="text-balance text-3xl font-semibold md:text-4xl">
              Integrate with your favorite tools
            </h2>
            <p className="text-muted-foreground mt-6">
              Connect seamlessly with popular platforms and services to enhance your workflow.
            </p>
          </div>

          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-2">
            {integrations.map((integration) => (
              <Card key={integration.id} className="p-6">
                <div className="relative">
                  <div className="mb-6">{integration.logo}</div>
                  
                  <div className="space-y-2 mb-6">
                    <h3 className="text-base font-medium">{integration.name}</h3>
                    <p className="text-muted-foreground line-clamp-2 text-sm">{integration.description}</p>
                  </div>

                  <div className="flex gap-3 border-t border-dashed pt-6">
                    <Button variant="secondary" size="sm" className="gap-1 pr-2 shadow-none">
                      Connect
                      <ChevronRight className="ml-0 !size-3.5 opacity-50" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

