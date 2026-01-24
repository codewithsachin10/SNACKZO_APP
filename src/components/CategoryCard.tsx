interface CategoryCardProps {
  title: string;
  emoji: string;
  count: number;
  color: "primary" | "secondary" | "accent" | "cyan" | "lime";
  onClick?: () => void;
}

const colorStyles = {
  primary: "from-primary/20 to-primary/5 border-primary/30 hover:border-primary/60",
  secondary: "from-secondary/20 to-secondary/5 border-secondary/30 hover:border-secondary/60",
  accent: "from-accent/20 to-accent/5 border-accent/30 hover:border-accent/60",
  cyan: "from-cyan/20 to-cyan/5 border-cyan/30 hover:border-cyan/60",
  lime: "from-lime/20 to-lime/5 border-lime/30 hover:border-lime/60",
};

const CategoryCard = ({ title, emoji, count, color, onClick }: CategoryCardProps) => {
  return (
    <button
      onClick={onClick}
      className={`glass-card p-6 text-left bg-gradient-to-br ${colorStyles[color]} group transition-all duration-300 hover:scale-[1.02]`}
    >
      <div className="text-4xl mb-3 group-hover:scale-110 transition-transform">
        {emoji}
      </div>
      <h3 className="font-bold text-lg mb-1 group-hover:text-primary transition-colors">
        {title}
      </h3>
      <p className="text-sm text-muted-foreground">
        {count} {count === 1 ? "item" : "items"}
      </p>
    </button>
  );
};

export default CategoryCard;
