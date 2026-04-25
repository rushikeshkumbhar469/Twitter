import Landing from "@/components/landing";
import MainLayout from "@/components/layout/mainlayout";
import { AuthProvider} from "@/context/authcontext";
import { TranslationProvider } from "@/context/translationcontext";

export default function Home() {
  return (
    <AuthProvider>
      <TranslationProvider>
        <MainLayout>
          <Landing/>
        </MainLayout>
      </TranslationProvider>
    </AuthProvider>
  );
}
