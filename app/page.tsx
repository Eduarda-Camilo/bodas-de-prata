import TravelApp from "@/components/TravelApp";
import { hasSession, dbConfigured, driveConfigured } from "@/lib/server";
export const dynamic = "force-dynamic";
export default async function Page() {
  const configured = Boolean(
    process.env.TRIP_SECRET && process.env.SESSION_SECRET,
  );
  const authorized = await hasSession();
  if (configured && !authorized)
    return (
      <main className="access-message">
        <span className="eyebrow">CLEIDE & FLÁVIO · 25 ANOS</span>
        <h1>
          A viagem de vocês
          <br />
          começa pelo link privado.
        </h1>
        <p>
          Abra o link que a Duda enviou para acompanhar o roteiro e guardar as
          memórias desta jornada.
        </p>
        <p>Não é preciso criar uma conta.</p>
      </main>
    );
  return (
    <TravelApp
      authorized={authorized}
      sharedConfigured={dbConfigured()}
      driveConfigured={driveConfigured()}
    />
  );
}
