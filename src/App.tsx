import { BrowserRouter, Route, Routes } from "react-router-dom";
import { AppLayout } from "./components/AppLayout";
import { AboutPage } from "./pages/AboutPage";
import { AdminPage } from "./pages/AdminPage";
import { CampingPage } from "./pages/CampingPage";
import { GalleryPage } from "./pages/GalleryPage";
import { HikingPage } from "./pages/HikingPage";
import { HomePage } from "./pages/HomePage";
import { JourneyDetailsPage } from "./pages/JourneyDetailsPage";
import { JourneysPage } from "./pages/JourneysPage";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppLayout />}>
          <Route index element={<HomePage />} />
          <Route path="journeys" element={<JourneysPage />} />
          <Route path="journeys/:slug" element={<JourneyDetailsPage />} />
          <Route path="gallery" element={<GalleryPage />} />
          <Route path="camping" element={<CampingPage />} />
          <Route path="hiking" element={<HikingPage />} />
          <Route path="about" element={<AboutPage />} />
          <Route path="admin" element={<AdminPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
