import type { SVGProps } from 'react';
import Settings from 'lucide-react/icons/settings';
import Eye from 'lucide-react/icons/eye';
import EyeOff from 'lucide-react/icons/eye-off';
import User from 'lucide-react/icons/user';
import Bell from 'lucide-react/icons/bell';
import AlertCircle from 'lucide-react/icons/alert-circle';
import X from 'lucide-react/icons/x'; // Import the X icon
import Edit from 'lucide-react/icons/edit'; // Import the Edit icon
import Trash2 from 'lucide-react/icons/trash-2'; // Import the Delete icon

export const Icons = {
  logo: (props: SVGProps<SVGSVGElement>) => (
    <svg 
      width="24" 
      height="24" 
      viewBox="0 0 24 24" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
        <path d="M12 2L2 7V17L12 22L22 17V7L12 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M2 7L12 12L22 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M12 12V22" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  settings: Settings, // Add the new icon
  logoWithName: (props: SVGProps<SVGSVGElement>) => (
    <svg 
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 134 24" 
      fill="currentColor"
      {...props}
    >
      <path d="M12.7663 2.03043L7.33913 22.3913H4.42174L0 2.03043H3.06957L5.86522 15.6826L8.69565 2.03043H12.7663Z" />
      <path d="M14.5 2.03043H28.4696V4.86087H17.513V11.2348H27.3478V14.0652H17.513V22.3913H14.5V2.03043Z" />
      <path d="M29.9826 2.03043H43.9522V4.86087H32.9957V11.2348H42.8261V14.0652H32.9957V22.3913H29.9826V2.03043Z" />
      <path d="M49.6957 2.03043L55.1217 22.3913H52.2043L46.7783 2.03043H49.6957Z" />
      <path d="M60.3142 22.3913V2.03043H63.3229V22.3913H60.3142Z" />
      <path d="M69.0522 2.03043L74.8435 15.8261L80.6348 2.03043H83.6783L76.2609 22.3913H73.4652L66 2.03043H69.0522Z" />
      <path d="M85.1174 2.03043H99.087V4.86087H88.1304V11.2348H97.9609V14.0652H88.1304V22.3913H85.1174V2.03043Z" />
      <path d="M110.14 13.5913L114.288 2.03043H117.436L111.497 16.4826V22.3913H108.488V16.413L101.462 2.03043H104.723L110.14 13.5913Z" />
      <path d="M120.37 2.03043H123.378V22.3913H120.37V2.03043Z" />
      <path d="M124.857 2.03043H138.826V4.86087H127.87V11.2348H137.7V14.0652H127.87V22.3913H124.857V2.03043Z" />
    </svg>
  ),
  google: (props: SVGProps<SVGSVGElement>) => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 48 48"
      width="48px"
      height="48px"
      {...props}
    >
      <path
        fill="#FFC107"
        d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12c0-6.627,5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24c0,11.045,8.955,20,20,20c11.045,0,20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z"
      />
      <path
        fill="#FF3D00"
        d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z"
      />
      <path
        fill="#4CAF50"
        d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.223,0-9.651-3.356-11.303-8H6.306C9.656,39.663,16.318,44,24,44z"
      />
      <path
        fill="#1976D2"
        d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571l6.19,5.238C42.022,35.244,44,30.036,44,24C44,22.659,43.862,21.35,43.611,20.083z"
      />
    </svg>
  ),

  spinner: (props: SVGProps<SVGSVGElement>) => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    </svg>
  ),
  eye: Eye,
  eyeOff: EyeOff,
  user: User,
  close: X, // Add the close icon here
  edit: Edit, // Add the edit icon
  delete: Trash2, // Add the delete icon
  notification: Bell,        // Icon cho thông báo chung
  default: AlertCircle,  
};
