// This is a demo of a preview
// That's what users will see in the preview

import { FullScreenSignup } from "@/components/ui/full-screen-signup";

const DemoSignup = () => {
  return <FullScreenSignup mode="signup" />;
};

const DemoSignin = () => {
  return <FullScreenSignup mode="signin" />;
};

// IMPORTANT:
// format of the export MUST be export default { DemoOneOrOtherName }
// if you don't do this, the demo will not be shown
export default { DemoSignup, DemoSignin };
