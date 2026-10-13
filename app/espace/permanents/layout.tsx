import GardeApp from "../_noyau/GardeApp";

export default function Layout({ children }: { children: React.ReactNode }) {
  return <GardeApp code="permanents">{children}</GardeApp>;
}
