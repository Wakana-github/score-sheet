import { SignUp } from '@clerk/nextjs'

//Clerk signup page
export default function Page() {

  return (
  <div className="w-full min-h-[calc(100vh-4rem)] flex items-center justify-center normal_font">
    <SignUp/>
    </div>
  );
}