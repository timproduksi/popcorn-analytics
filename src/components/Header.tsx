import { Wheat } from "lucide-react";

const Header = () => {
  return (
    <header className="gradient-primary py-6 px-4 shadow-lg">
      <div className="container mx-auto flex items-center gap-3">
        <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-primary-foreground/20 backdrop-blur-sm">
          <Wheat className="w-7 h-7 text-primary-foreground" />
        </div>
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-primary-foreground">
            POP CORN
          </h1>
          <p className="text-sm text-primary-foreground/80 font-medium">
            Informasi KSA Jagung Jawa Tengah
          </p>
        </div>
      </div>
    </header>
  );
};

export default Header;
