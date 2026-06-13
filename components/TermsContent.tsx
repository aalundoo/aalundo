// Terms & Conditions / Disclaimer text — reused by the modal and /terms page.
export default function TermsContent() {
  return (
    <div className="space-y-5 text-sm leading-relaxed text-slate-300">
      <p className="text-slate-400">
        By using Aalundo you agree to the following terms. Please read them
        carefully.
      </p>

      <Section title="1. What Aalundo is">
        Aalundo is a platform that provides real-time voice rooms for
        conversations. We provide the tools to connect — we do not create,
        monitor, or control what people say or do inside the rooms.
      </Section>

      <Section title="2. Your conduct & responsibility">
        You are <strong>solely responsible</strong> for your own behaviour and
        for anything you say, share, or do while using Aalundo. You agree to be
        respectful and to follow all applicable laws.
      </Section>

      <Section title="3. Disclaimer of liability">
        Aalundo and its creators are{" "}
        <strong>not responsible for any misbehaviour</strong> of users —
        including but not limited to harassment, abusive, offensive, hateful,
        illegal, or inappropriate language or content shared in any voice room.
        Any interactions are between users themselves. We are not liable for any
        loss, harm, dispute, or damage of any kind arising from your use of the
        platform or from the conduct of other users. You use Aalundo entirely at
        your own risk.
      </Section>

      <Section title="4. Moderation">
        We may remove rooms, codes, or restrict access at any time, with or
        without notice, if we believe these terms are being violated — but we
        are under no obligation to monitor activity.
      </Section>

      <Section title="5. Privacy">
        We use your Google account only to identify you (name and avatar). Voice
        is transmitted peer-to-peer between participants and is not recorded by
        us.
      </Section>

      <Section title="6. Changes">
        We may update these terms at any time. Continued use of Aalundo means
        you accept the latest version.
      </Section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="font-semibold text-slate-100">{title}</h3>
      <p className="mt-1">{children}</p>
    </div>
  );
}
