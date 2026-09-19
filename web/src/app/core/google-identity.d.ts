// Minimal ambient typings for the Google Identity Services script loaded in index.html
// (https://accounts.google.com/gsi/client). Only the pieces this app actually uses.
interface GoogleIdCredentialResponse {
  credential: string;
}

interface GoogleIdConfig {
  client_id: string;
  callback: (response: GoogleIdCredentialResponse) => void;
}

interface GoogleIdButtonOptions {
  type?: 'standard' | 'icon';
  theme?: 'outline' | 'filled_blue' | 'filled_black';
  size?: 'large' | 'medium' | 'small';
  text?: 'signin_with' | 'signup_with' | 'continue_with' | 'signin';
  shape?: 'rectangular' | 'pill' | 'circle' | 'square';
  width?: number;
}

interface Window {
  google?: {
    accounts: {
      id: {
        initialize(config: GoogleIdConfig): void;
        renderButton(parent: HTMLElement, options: GoogleIdButtonOptions): void;
      };
    };
  };
}
