import { ReactNode } from "react"
import { useAuthState } from "react-firebase-hooks/auth"
import { auth } from "@app/firebase"

type Props = {
  children: ReactNode
};

export const SignedIn = ({ children }: Props) => {
  const [user] = useAuthState(auth);

  if (!user) return null;
  
  return <>{children}</>;
};

  
  