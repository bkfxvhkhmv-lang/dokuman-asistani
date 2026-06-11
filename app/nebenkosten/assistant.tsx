import { NebenkostenDraftProvider } from '@/features/vermieter/nebenkosten/store';
import NebenkostenAssistantScreen from '@/features/vermieter/nebenkosten/screens/NebenkostenAssistantScreen';

export default function NebenkostenAssistantRoute() {
  return (
    <NebenkostenDraftProvider>
      <NebenkostenAssistantScreen />
    </NebenkostenDraftProvider>
  );
}
