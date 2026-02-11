import Landing from "@/components/landing";
import MainLayout from "@/components/layout/mainlayout";
import Image from "next/image";
import { AuthProvider} from "@/context/authcontext";

export default function Home() {
  return (
    <AuthProvider>
      <MainLayout>
        <Landing/>
      </MainLayout>
    </AuthProvider>
  );
}
