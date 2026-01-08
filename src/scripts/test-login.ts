import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { AuthService } from '../auth/auth.service';

async function main() {
  const app = await NestFactory.createApplicationContext(AppModule);
  try {
    const auth = app.get(AuthService);
    const result = await auth.login({
      email: 'admin@verte.com',
      password: '123456',
    });
    console.log(JSON.stringify(result, null, 2));
  } catch (err) {
    console.error(
      'Login failed:',
      err instanceof Error ? err.message : String(err),
    );
  } finally {
    await app.close();
  }
}

void main();
