import { createSafeActionClient } from "./src/index";
import { z } from "zod";

const ac = createSafeActionClient();

// Test: Basic schema inference  
const test1 = ac
  .inputSchema(z.object({ name: z.string() }))
  .action(async ({ parsedInput }) => {
    // This should infer parsedInput as { name: string }
    const name: string = parsedInput.name;
    return { success: true, name };
  });
