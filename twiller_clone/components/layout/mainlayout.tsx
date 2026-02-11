"use client";
import Sidebar from "./sidebar";
import RightSidebar from "./rightsidebar";
import React, {useState} from "react";
import LoadingSpinner from "../loading-spinner";
import { useAuth } from "@/context/authcontext";
import ProfilePage from "../profilepage";

const Mainlayout = ({children} : any) =>{
    const {user, isLoading} = useAuth();
    const [currentPage, setCurrentPage] = useState('home');
    if (isLoading) {
        return(
            <div className="min-h-screen bg-black flex items-center justify-center">
                <div className="text-center">
                    <div className="text-white text-4xl font-bold mb-4">X</div>
                    <LoadingSpinner size="lg"/>
                </div>
            </div>
        );
    }
    if (!user){
        return<>{children}</>;
    }
    return(
        <div>
            <div className="min-h-screen bg-black text-white flex">
                <Sidebar currentPage={currentPage} onNavigate={setCurrentPage}/>
                <main className="flex-1">
                    {currentPage === "profile" ? <ProfilePage/> : children}
                </main>
                <RightSidebar />
            </div>
        </div>
    )
}

export default Mainlayout;