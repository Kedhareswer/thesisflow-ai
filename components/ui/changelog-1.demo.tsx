import { Changelog1 } from "@/components/ui/changelog-1";

const DemoOne = () => {
  return (
    <Changelog1  
      title="Changelog"
      description="Get the latest updates and improvements to our platform."
      entries={[
        {
          version: "Version 1.3.0",
          date: "15 November 2024",
          title: "Enhanced Analytics Dashboard",
          description:
            "We've completely redesigned our analytics dashboard to provide deeper insights and improved visualizations of your data.",
          items: [
            "Interactive data visualizations with real-time updates",
            "Customizable dashboard widgets",
            "Export analytics in multiple formats (CSV, PDF, Excel)",
            "New reporting templates for common use cases",
            "Improved data filtering and segmentation options",
          ],
          image: "https://images.unsplash.com/photo-1551281044-8d8e6d8a2a96?q=80&w=1200&auto=format&fit=crop",
          button: {
            url: "https://shadcnblocks.com",
            text: "Learn more",
          }
        },
        {
          version: "Version 1.2.5",
          date: "7 October 2024",
          title: "Mobile App Launch",
          description:
            "We're excited to announce the launch of our mobile application, available now on iOS and Android platforms.",
          items: [
            "Native mobile experience for on-the-go productivity",
            "Offline mode support for working without internet connection",
            "Push notifications for important updates",
            "Biometric authentication for enhanced security",
          ],
        },
        {
          version: "Version 1.2.1",
          date: "23 September 2024",
          title: "New features and improvements",
          description:
            "Here are the latest updates and improvements to our platform. We are always working to improve our platform and your experience.",
          items: [
            "Added new feature to export data",
            "Improved performance and speed",
            "Fixed minor bugs and issues",
            "Added new feature to import data",
          ],
          image: "https://images.unsplash.com/photo-1522071820081-009f0129c71c?q=80&w=1200&auto=format&fit=crop"
        },
        {
          version: "Version 1.0.0",
          date: "31 August 2024",
          title: "First version of our platform",
          description:
            "Introducing a new platform to help you manage your projects and tasks. We are excited to launch our platform and help you get started. We are always working to improve our platform and your experience.",
          image: "https://images.unsplash.com/photo-1556157382-97eda2d62296?q=80&w=1200&auto=format&fit=crop",
          button: {
            url: "https://shadcnblocks.com",
            text: "Learn more"
          }
        }
      ]}
    />
  );
};

export { DemoOne };
