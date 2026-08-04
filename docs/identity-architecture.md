# Identity Architecture

## Overview
The Identity Layer provides authentication and user identity management for the Contrata360 Platform. Following Clean Architecture and Domain-Driven Design (DDD), this layer ensures that the application remains entirely decoupled from any specific identity provider (e.g., Supabase, AWS Cognito, Auth0).

By creating interfaces (ports) in the Domain Layer, the core application logic knows nothing about HTTP, Supabase SDKs, or JWT details.

## Architecture Diagram

```mermaid
flowchart TD
    subgraph Frontend
        A[Frontend App]
    end

    subgraph Backend_Presentation
        C[AuthController]
        M[AuthMiddleware]
    end

    subgraph Backend_Application
        IS[IdentityService]
    end

    subgraph Backend_Domain
        IP[IdentityProvider Interface]
        AU[AuthenticatedUser Entity]
    end

    subgraph Backend_Infrastructure
        SP[SupabaseIdentityProvider Adapter]
        CG[CognitoIdentityProvider Adapter]
        R[IdentityProviderRegistry]
    end

    subgraph External_Services
        SUP[Supabase Auth]
        COG[AWS Cognito Auth]
    end

    A -->|POST /auth/login| C
    A -->|Bearer Token| M
    C --> IS
    M --> IS
    IS --> IP
    IS -.-> AU
    IP <|-- SP
    IP <|-- CG
    R --> SP
    R --> CG
    SP --> SUP
    CG --> COG
```

## How to replace Supabase with Cognito

Since `IdentityService` depends on the `IdentityProvider` interface and not on a specific implementation, changing the provider is straightforward:

1. **Create the New Adapter**:
Implement the `IdentityProvider` interface for Cognito.

```typescript
// src/modules/identity/infrastructure/CognitoIdentityProvider.ts
import { IdentityProvider } from '../domain/IdentityProvider';
import { AuthResult, LoginCredentials, RegisterCredentials } from '../domain/dtos';
import { AuthenticatedUser } from '../domain/AuthenticatedUser';

export class CognitoIdentityProvider implements IdentityProvider {
  async register(credentials: RegisterCredentials): Promise<AuthResult> {
    // Call AWS Cognito SDK
  }

  async login(credentials: LoginCredentials): Promise<AuthResult> {
    // Call AWS Cognito SDK
  }

  async logout(token: string): Promise<void> {
    // Handle Cognito logout
  }

  async refresh(refreshToken: string): Promise<AuthResult> {
    // Refresh token via Cognito
  }

  async verifyToken(token: string): Promise<any> {
    // Verify Cognito JWT
  }

  async getUser(token: string): Promise<AuthenticatedUser | null> {
    // Fetch user from Cognito and map it to AuthenticatedUser
  }

  async resetPassword(email: string): Promise<void> {
    // Handle password reset
  }
}
```

2. **Register the New Adapter**:
In your application bootstrap (e.g., where you set up Dependency Injection), register the new adapter in the `IdentityProviderRegistry` and set it as the default.

```typescript
import { IdentityProviderRegistry } from './modules/identity/infrastructure/IdentityProviderRegistry';
import { CognitoIdentityProvider } from './modules/identity/infrastructure/CognitoIdentityProvider';

const cognitoProvider = new CognitoIdentityProvider();
IdentityProviderRegistry.register('cognito', cognitoProvider);
IdentityProviderRegistry.setDefault('cognito');
```

The rest of the system (`IdentityService`, `AuthController`, etc.) will continue to function without any changes because they only interact with the `IdentityProvider` interface.
