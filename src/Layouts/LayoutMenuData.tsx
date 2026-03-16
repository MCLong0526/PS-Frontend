import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getLoggedinUser } from "../helpers/api_helper";

const Navdata = () => {
    const history = useNavigate();

    const [isDashboard, setIsDashboard] = useState<boolean>(false);
    const [iscurrentState, setIscurrentState] = useState('Dashboard');

    // Read role on every render — VerticalLayout calls navdata() as a plain
    // function, so this re-runs on every parent render (i.e. every navigation).
    const storedRole = localStorage.getItem("role") || getLoggedinUser()?.role;
    const isAdmin = storedRole === "ADMIN";

    function updateIconSidebar(e: any) {
        if (e && e.target && e.target.getAttribute("sub-items")) {
            const ul: any = document.getElementById("two-column-menu");
            const iconItems: any = ul.querySelectorAll(".nav-icon.active");
            let activeIconItems = [...iconItems];
            activeIconItems.forEach((item) => {
                item.classList.remove("active");
                var id = item.getAttribute("sub-items");
                const getID = document.getElementById(id) as HTMLElement;
                if (getID)
                    getID.classList.remove("show");
            });
        }
    }

    useEffect(() => {
        document.body.classList.remove('twocolumn-panel');
        if (iscurrentState !== 'Dashboard') {
            setIsDashboard(false);
        }
    }, [history, iscurrentState, isDashboard]);

    const menuItems: any = [
        {
            label: "Menu",
            isHeader: true,
        },
        {
            id: "dashboard",
            label: "Dashboard",
            icon: "ri-dashboard-2-line",
            link: "/dashboard",
            stateVariables: isDashboard,
            click: function (e: any) {
                e.preventDefault();
                setIsDashboard(!isDashboard);
                setIscurrentState('Dashboard');
                updateIconSidebar(e);
                history("/dashboard");
            },
        },
        // ADMIN-only items
        ...(isAdmin ? [
            {
                id: "admin-users",
                label: "User Management",
                icon: "ri-team-line",
                link: "/admin/users",
            },
            {
                id: "admin-products",
                label: "Product Management",
                icon: "ri-store-2-line",
                link: "/admin/products",
            },
            {
                id: "admin-requests",
                label: "Request Management",
                icon: "ri-truck-line",
                link: "/admin/requests",
            },
            {
                id: "admin-payment-settings",
                label: "Payment Settings",
                icon: "ri-bank-line",
                link: "/admin/payment-settings",
            },
        ] : []),

        // CUSTOMER-only items
        ...(!isAdmin ? [
            {
                id: "products",
                label: "Products",
                icon: "ri-store-2-line",
                link: "/products",
            },
            {
                id: "my-requests",
                label: "My Requests",
                icon: "ri-list-check-2",
                link: "/my-requests",
            },
        ] : []),
    ];

    return <React.Fragment>{menuItems}</React.Fragment>;
};

export default Navdata;
