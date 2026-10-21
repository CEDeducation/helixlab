import 'ketcher-react/dist/index.css';
import 'molstar/lib/mol-plugin-ui/skin/light.scss';
import './globals.css';
import type {Metadata} from 'next';
export const metadata:Metadata={title:'HelixLab Research',description:'Student molecular research and group collaboration'};
export default function RootLayout({children}:{children:React.ReactNode}){
  return <html lang="en"><body>{children}</body></html>;
}
