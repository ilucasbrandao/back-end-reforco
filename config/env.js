if (process.env.NODE_ENV !== "production") {
  const dotenv = await import("dotenv");
  dotenv.config();
}

if (!process.env.JWT_SECRET) {
  console.error("JWT_SECRET não definido");
  process.exit(1);
}
